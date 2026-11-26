import type { SearchFilters, SourceHealth, Vacancy, VacancyResponse } from '../types'
import { recentCheck, currentListing } from './freshness'
import { studios, studioDetail, studioProviders } from '../../server/providers/greenhouse'
import { creativeQuery } from './creativeRoles'
import { boards, isArtBoard, cityProviders, boardDetail } from '../../server/providers/cityBoards'
import { fetchTrudvsem, trudDetail } from '../../server/providers/trudvsem'
import { PartialListings } from '../../server/partialListings'
import { normalizeSearch } from '../../server/normalize'
import { catalogResponse } from './catalogResponse'
import type { PublicCatalog } from './publicCatalogTypes'

let catalog: Promise<PublicCatalog> | undefined
let loadedAt = 0
let forcedAt = 0
const liveBoards = new Map<string, { expires: number; jobs: Promise<{jobs:Vacancy[]; checkedAt:string}> }>()
const rejectedJobs = new Set<string>()

async function fetchCatalog() {
  const path = import.meta.env.BASE_URL + 'feeds/catalog.json'
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const response = await fetch(path + '.gz',{cache:'no-cache'})
      if (response.ok) {
        const bytes = await response.arrayBuffer()
        const header = new Uint8Array(bytes,0,2)
        const unpacked = header[0] === 31 && header[1] === 139
          ? new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))) : new Response(bytes)
        return await unpacked.json() as PublicCatalog
      }
    } catch { /* Hosts and older releases may serve the uncompressed feed only. */ }
  }
  const response = await fetch(path, {cache:'no-cache'})
  if(!response.ok) throw Error('Не удалось загрузить публичные ленты')
  return await response.json() as PublicCatalog
}

function readCatalog(revision = 0) {
  if (revision > forcedAt) { forcedAt = revision; catalog = undefined }
  if (!catalog || Date.now() - loadedAt > 5 * 60_000) {
    loadedAt = Date.now()
    catalog = fetchCatalog().then(data => {
      if (data.version !== 1 || !Array.isArray(data.items)) throw Error('Неверный формат каталога')
      return data
    }).catch(error => { catalog = undefined; throw error })
  }
  return catalog
}

function inSource(job: Vacancy, source: SearchFilters['source']) {
  return source === 'all' || source === job.source || (job.isTelegram && source === 'telegram:' + job.externalId.split(':')[0])
}

type LiveSource = Pick<typeof cityProviders[number], 'id' | 'fetch'>
function liveListings(provider: LiveSource, filters: SearchFilters, revision: number) {
  const key = [revision, provider.id, normalizeSearch(filters.q)].join(':')
  const known = liveBoards.get(key)
  if (known && known.expires > Date.now()) return known.jobs
  for (const [k,v] of liveBoards) if (v.expires <= Date.now()) liveBoards.delete(k)
  const jobs = provider.fetch(filters).then(jobs=>({jobs,checkedAt:new Date().toISOString()})).catch(error => { liveBoards.delete(key); throw error })
  liveBoards.set(key, { expires: Date.now() + 5 * 60_000, jobs })
  return jobs
}

export async function publishedSearch(filters: SearchFilters, phase: 'cache' | 'live', revision: number): Promise<VacancyResponse> {
  const snapshot = await readCatalog(revision)
  const fresh = recentCheck(snapshot.fetchedAt)
  const upstreamMatches = new Set(snapshot.matches[normalizeSearch(filters.q)] ?? [])
  const sourceRows = new Map(snapshot.sources.map(s => [s.id, !fresh && (s.status === 'online' || s.status === 'degraded')
    ? {...s, status: 'unavailable' as const, count:0, error:'Срок проверки ленты истёк.'} : s]))
  let items = fresh ? snapshot.items.filter(job => inSource(job, filters.source) && !rejectedJobs.has(job.id)).map(job =>
    upstreamMatches.has(job.id) && filters.q ? {...job, matchedQuery:normalizeSearch(filters.q)} : job) : []
  if (phase === 'live' && (filters.q.trim() || !fresh || revision > 0 && filters.source !== 'all')) {
    const smart = fresh && filters.source === 'all' && creativeQuery(filters.q).length
      ? cityProviders.filter(provider=>isArtBoard(provider.id)) : cityProviders
    const direct: LiveSource[] = [...smart, ...(!fresh || filters.source !== 'all' ? studioProviders : [])]
    if (filters.q.trim()) direct.push({id:'trudvsem',fetch:fetchTrudvsem})
    const active = direct.filter(p => filters.source === 'all' || filters.source === p.id)
    const results = await Promise.all(active.map(async provider => {
      const health = sourceRows.get(provider.id)!
      try {
        const {jobs,checkedAt} = await liveListings(provider, filters, revision)
        return { id:provider.id, jobs, health:{...health,status:'online',error:null,count:jobs.length,fetchedAt:checkedAt} as SourceHealth }
      } catch (error) {
        if (error instanceof PartialListings && error.jobs.length) {
          return {id:provider.id,jobs:error.jobs,health:{...health,status:'degraded',count:error.jobs.length,error:error.message,fetchedAt:new Date().toISOString()} as SourceHealth}
        }
        const count = items.filter(job=>job.source===provider.id).length
        return { id:provider.id, jobs:null, health:{...health,status:count?'degraded':'unavailable',count,error:'Прямое соединение с доской работодателя недоступно.'} as SourceHealth }
      }
    }))
    for (const result of results) {
      sourceRows.set(result.id,result.health)
      if (result.jobs) {
        const known = new Map(items.filter(job=>job.source===result.id && job.description).map(job=>[job.id,job]))
        const current = result.jobs.filter(job=>!rejectedJobs.has(job.id)).map(job => {
          const previous = known.get(job.id)
          return !job.description && previous && currentListing(previous) ? { ...job, description: previous.description } : job
        })
        items = [...items.filter(job=>job.source!==result.id), ...current]
      }
    }
  }
  return catalogResponse(items, filters, [...sourceRows.values()])
}

export async function publishedDetail(source: string, externalId: string, registryKey: string | null = null) {
  if(source==='trudvsem' && registryKey) {
    try { return await trudDetail(registryKey) }
    catch (error) {
      if ([404,410].includes((error as {status?:number}).status ?? 0)) {
        rejectedJobs.add(source+':'+externalId); throw Object.assign(Error('Запись снята'),{status:410})
      }
      throw error
    }
  }
  const studio = studios.find(entry => entry.id === source)
  const board = boards.find(entry => entry.id === source)
  if ((board || studio) && /^\d+$/.test(externalId)) {
    try { return studio ? await studioDetail(studio, externalId) : await boardDetail(board!, externalId) }
    catch (error) {
      const status = (error as {status?: number}).status
      if (status === 404 || status === 410) { rejectedJobs.add(source+':'+externalId); throw Object.assign(Error('Объявление закрыто'), {status:410}) }
      throw error
    }
  }
  const snapshot = await readCatalog()
  const job = snapshot.items.find(item => item.source === source && item.externalId === externalId)
  if (!recentCheck(snapshot.fetchedAt)) throw Error('Срок проверки ленты истёк.')
  const providerId = source === 'telegram' ? 'telegram:' + externalId.split(':')[0] : source
  if (!job && snapshot.sources.find(row=>row.id===providerId)?.status !== 'online') throw Error('Источник временно недоступен.')
  if (!job) throw Object.assign(Error('Публикация отсутствует в текущей ленте'),{status:409})
  if (!currentListing(job)) throw Object.assign(Error('Срок показа объявления истёк'),{status:410})
  return {description:job.description, url:job.url, verifiedAt:job.verifiedAt}
}
