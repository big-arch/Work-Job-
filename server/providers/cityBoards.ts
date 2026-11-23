import { emptySalary, type Vacancy } from '../../src/types'
import { fetchJson, plainText } from '../http'
import { detectDomain, normalizeSearch } from '../normalize'
import type { ProviderDefinition } from '../../src/types'

interface Posting {
  id: string
  name: string
  company: { name: string }
  location: { city?: string; country?: string; address?:string; hybrid?: boolean; remote?: boolean }
  releasedDate?: string
  jobAd?: { sections?: Record<string, { title?: string; text?: string }> }
  postingUrl?: string
  function?: { label?:string }
  industry?: { label?:string }
  experienceLevel?: { id?:string; label?:string }
  typeOfEmployment?: { label?:string }
  department?: { label?:string }
  compensation?: {min?:number;max?:number;currency?:string; interval?:string}
  customField?: { fieldLabel?:string; valueLabel?:string }[]
  active?: boolean
  visibility?: string
}

export const boards = [
  { id: 'egis', board: 'EgisGroup', name: 'Egis', city: 'Dubai' },
  { id: 'sixt', board: 'SIXT', name: 'SIXT', city: 'Munich' },
  { id: 'endava', board: 'Endava', name: 'Endava', city: 'Belgrade' },
  { id: 'aecom', board: 'AECOM2', name: 'AECOM', city: '' },
  { id: 'ramboll', board: 'Ramboll3', name: 'Ramboll', city: '' },
] as const
const countries = new Intl.DisplayNames(['ru'], { type: 'region' })
type Board = typeof boards[number]
const api = (board: Board) => 'https://api.smartrecruiters.com/v1/companies/' + board.board + '/postings'
const home = (board: Board) => 'https://jobs.smartrecruiters.com/' + board.board

function postingFacts(job: Posting) {
  const field = (name:string) => job.customField?.find(item=>item.fieldLabel===name)?.valueLabel
  return {
    employment:job.typeOfEmployment?.label,
    experience:(job.experienceLevel?.id !== 'not_applicable' ? job.experienceLevel?.label : undefined) || field('Experience level for career site'),
    industry:job.industry?.label, department:job.department?.label || field('Global Business Area') || job.function?.label,
    address:job.location.address,
  }
}

function listing(board: Board, job: Posting, query: string): Vacancy {
  const code = job.location.country?.toUpperCase()
  const url = home(board) + '/' + job.id
  return {
    id: board.id + ':' + job.id, externalId: String(job.id), source: board.id, sourceName: board.name,
    sourceUrl: home(board), title: job.name.trim(), company: job.company.name, companyLogo: null, description: '',
    city: job.location.city || null, country: code && /^[A-Z]{2}$/.test(code) ? countries.of(code) ?? null : null,
    countryCode: code || null, workFormat: job.location.hybrid ? 'hybrid' : job.location.remote ? 'remote' : 'unspecified',
    domain: detectDomain(job.name, '', [query]), salary: { ...emptySalary }, publishedAt: job.releasedDate ?? null,
    verifiedAt: new Date().toISOString(), url, applyUrl: url, tags: [], isDemo: false, isTelegram: false,
    ...postingFacts(job), detailPending: true, matchedQuery: query,
  }
}

export const cityProviders: ProviderDefinition[] = boards.map(board => ({
  id: board.id, name: board.name, homeUrl: home(board), kind: 'ats', cacheTtlMs: 10 * 60_000, queryAware: true,
  note: 'Публичные вакансии работодателя. Поиск по всем городам. Статус повторно проверяется при открытии карточки.',
  async fetch(filters) {
    const query = normalizeSearch(filters.q) || (board.city ? '' : 'bim')
    const params = new URLSearchParams({ destination: 'PUBLIC', limit: '100' })
    if (query) params.set('q', query)
    else params.set('city', board.city)
    const jobs: Vacancy[] = []
    let offset = 0
    while (true) {
      params.set('offset', String(offset))
      const page = await fetchJson<{ content: Posting[]; totalFound: number }>(api(board) + '?' + params)
      if (!Array.isArray(page.content) || !Number.isFinite(page.totalFound)) throw Error('Неверный формат списка вакансий')
      for (const job of page.content) {
        if (/^\d+$/.test(String(job.id)) && job.active !== false && (!job.visibility || job.visibility === 'PUBLIC'))
          jobs.push(listing(board, job, query))
      }
      offset += page.content.length
      if (offset >= page.totalFound) break
      if (!page.content.length) throw Error('Источник вернул неполную страницу')
    }
    return jobs
  },
}))

export async function boardDetail(board: Board, id: string) {
  const job = await fetchJson<Posting>(api(board) + '/' + id)
  if (String(job.id) !== id || job.active !== true || job.visibility !== 'PUBLIC')
    throw Object.assign(Error('Вакансия снята'), { status: 410 })
  const sections = job.jobAd?.sections ?? {}
  const labels = {jobDescription:'Обязанности', qualifications:'Требования', additionalInformation:'Условия', companyDescription:'О компании'}
  const parts = Object.entries(labels).map(([key,label]) => ({label,text:plainText(sections[key]?.text,120000)})).filter(part=>part.text)
  const comp=job.compensation
  const range=[comp?.min,comp?.max].filter((n):n is number=>typeof n==='number' && Number.isFinite(n) && n>0)
  return {
    description:parts.map(part=>part.text).join('\n\n'),sections:parts, ...postingFacts(job),
    pay:range.length?[range.join(' – '),comp?.currency,comp?.interval].filter(Boolean).join(' '):undefined,
    url:job.postingUrl?.startsWith(home(board)+'/') ? job.postingUrl : home(board)+'/'+id, verifiedAt:new Date().toISOString(),
  }
}
