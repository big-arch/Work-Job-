import type { SearchFilters, SourceHealth, Vacancy, VacancyResponse } from '../types'
import { boards, cityProviders, boardDetail } from '../../server/providers/cityBoards'
import { normalizeSearch } from '../../server/normalize'
import { catalogResponse } from './catalogResponse'
import type { PublicCatalog } from './publicCatalogTypes'

let catalog: Promise<PublicCatalog> | undefined
let loadedAt = 0
const liveBoards = new Map<string, { expires: number; jobs: Promise<Vacancy[]> }>()
const rejectedJobs = new Set<string>()

function readCatalog() {
  if (!catalog || Date.now() - loadedAt > 5 * 60_000) {
    loadedAt = Date.now()
    catalog = fetch(import.meta.env.BASE_URL + 'feeds/catalog.json', {cache:'no-cache'}).then(async response => {
      if (!response.ok) throw Error('Не удалось загрузить публичные ленты')
      const data = await response.json() as PublicCatalog
      if (data.version !== 1 || !Array.isArray(data.items)) throw Error('Неверный формат каталога')
      return data
    }).catch(error => { catalog = undefined; throw error })
  }
  return catalog
}

function inSource(job: Vacancy, source: SearchFilters['source']) {
  return source === 'all' || source === job.source || (job.isTelegram && source === 'telegram:' + job.externalId.split(':')[0])
}

function liveListings(provider: typeof cityProviders[number], filters: SearchFilters, revision: number) {
  const key = [revision, provider.id, normalizeSearch(filters.q)].join(':')
  const known = liveBoards.get(key)
  if (known && known.expires > Date.now()) return known.jobs
  for (const [k,v] of liveBoards) if (v.expires <= Date.now()) liveBoards.delete(k)
  const jobs = provider.fetch(filters).catch(error => { liveBoards.delete(key); throw error })
  liveBoards.set(key, { expires: Date.now() + 5 * 60_000, jobs })
  return jobs
}

export async function publishedSearch(filters: SearchFilters, phase: 'cache' | 'live', revision: number): Promise<VacancyResponse> {
  const snapshot = await readCatalog()
  const fresh = Date.now() - Date.parse(snapshot.fetchedAt) <= 48 * 3600_000
  const upstreamMatches = new Set(snapshot.matches[normalizeSearch(filters.q)] ?? [])
  const sourceRows = new Map(snapshot.sources.map(s => [s.id, !fresh && s.status === 'online'
    ? {...s, status: 'unavailable' as const, count:0, error:'Срок проверки ленты истёк.'} : s]))
  let items = fresh ? snapshot.items.filter(job => inSource(job, filters.source) && !rejectedJobs.has(job.id)).map(job =>
    upstreamMatches.has(job.id) && filters.q ? {...job, matchedQuery:normalizeSearch(filters.q)} : job) : []
  if (phase === 'live') {
    const active = cityProviders.filter(p => filters.source === 'all' || filters.source === p.id)
    const results = await Promise.all(active.map(async provider => {
      const health = sourceRows.get(provider.id)!
      try {
        const jobs = await liveListings(provider, filters, revision)
        return { id:provider.id, jobs, health:{...health,status:'online',error:null,count:jobs.length,fetchedAt:new Date().toISOString()} as SourceHealth }
      } catch {
        const count = items.filter(job=>job.source===provider.id).length
        return { id:provider.id, jobs:null, health:{...health,status:count?'degraded':'unavailable',count,error:'Прямое соединение с доской работодателя недоступно.'} as SourceHealth }
      }
    }))
    for (const result of results) {
      sourceRows.set(result.id,result.health)
      if (result.jobs) items = [...items.filter(job => job.source !== result.id), ...result.jobs.filter(job => !rejectedJobs.has(job.id))]
    }
  }
  return catalogResponse(items, filters, [...sourceRows.values()], snapshot.fetchedAt)
}

export async function publishedDetail(source: string, externalId: string) {
  const board = boards.find(entry => entry.id === source)
  if (board && /^\d+$/.test(externalId)) {
    try { return await boardDetail(board, externalId) }
    catch (error) {
      const status = (error as {status?: number}).status
      if (status === 404 || status === 410) { rejectedJobs.add(source+':'+externalId); throw Object.assign(Error('Объявление закрыто'), {status:410}) }
      throw error
    }
  }
  const snapshot = await readCatalog()
  const job = snapshot.items.find(item => item.source === source && item.externalId === externalId)
  if (!job || Date.now()-Date.parse(snapshot.fetchedAt)>48*3600_000) throw Object.assign(Error('Публикация отсутствует в свежей ленте'),{status:410})
  return {description:job.description, url:job.url, verifiedAt:job.verifiedAt}
}
