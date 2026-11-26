import { emptySalary, type ProviderDefinition, type SourceId, type Vacancy } from '../../src/types'
import { describedPay } from '../../src/lib/describedPay'
import { withinDeadline } from '../../src/lib/freshness'
import { fetchJson, plainText, safeUrl } from '../http'
import { detectDomain, inferLocation, inferWorkFormat } from '../normalize'

export const studios = [
  { id: 'epicgames', name: 'Epic Games', home: 'https://www.epicgames.com/site/careers/jobs' },
  { id: 'riotgames', name: 'Riot Games', home: 'https://www.riotgames.com/en/work-with-us/jobs' },
  { id: '2k', name: '2K', home: 'https://job-boards.greenhouse.io/2k' },
] as const

interface Posting {
  id: number
  internal_job_id?: number | null
  title: string
  company_name?: string
  location?: { name?: string }
  offices?: { name?: string }[]
  departments?: { name?: string }[]
  absolute_url: string
  content?: string
  first_published?: string
  application_deadline?: string | null
}

const endpoint = (board: string) => 'https://boards-api.greenhouse.io/v1/boards/' + encodeURIComponent(board) + '/jobs'

const htmlEntities: Record<string,string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }
export function greenhouseText(content = '') {
  // Greenhouse can wrap the entire HTML document in a second layer of HTML encoding.
  const markup = /&lt;\/?(?:p|div|span|strong|br|ul|li|h[1-6]|b|a)(?:\s|&gt;|\/)/i.test(content)
    ? content.replace(/&(amp|lt|gt|quot|#39);/g, (_, name: string) => htmlEntities[name]) : content
  return plainText(markup, 22000)
}

function listing(job: Posting, board: string, name: string, home: string, source: SourceId): Vacancy | null {
  const url = safeUrl(job.absolute_url, '')
  if (!job.id || !url || !job.title?.trim() || job.internal_job_id === null || !withinDeadline(job.application_deadline ?? undefined)) return null
  const description = greenhouseText(job.content)
  const locationText = job.location?.name || job.offices?.map(office => office.name).filter(Boolean).join(', ')
  const workFormat = inferWorkFormat(locationText)
  const location = inferLocation(locationText, workFormat === 'remote')
  const tags = (job.departments ?? []).flatMap(dept => dept.name ? [dept.name] : [])
  const externalId = source === 'greenhouse' ? board + ':' + job.id : String(job.id)
  return { id: source + ':' + externalId, externalId, source, sourceName: name, sourceUrl: home, title: job.title.trim(),
    company: job.company_name || name, companyLogo: null, description, ...location, workFormat, tags,
    domain: detectDomain(job.title, description, tags), department: tags[0], salary: { ...emptySalary, text:describedPay(description) },
    publishedAt: job.first_published || null, verifiedAt: new Date().toISOString(), validThrough: job.application_deadline || undefined,
    url, applyUrl: url, isDemo: false, isTelegram: false }
}

export async function greenhouseListings(board: string, name: string, home: string, source: SourceId) {
  const { jobs } = await fetchJson<{ jobs: Posting[] }>(endpoint(board) + '?content=true', {}, 25000)
  if (!Array.isArray(jobs)) throw Error('Студия не подтвердила список вакансий')
  return jobs.map(job => listing(job, board, name, home, source)).filter((job): job is Vacancy => !!job)
}

export const studioProviders: ProviderDefinition[] = studios.map(studio => ({
  id: studio.id, name: studio.name, homeUrl: studio.home, kind: 'ats', cacheTtlMs: 30 * 60_000,
  note: 'Публичная доска студии. В карточке повторно проверяем публикацию у работодателя.',
  fetch: () => greenhouseListings(studio.id, studio.name, studio.home, studio.id),
}))

export async function studioDetail(studio: typeof studios[number], id: string) {
  const raw = await fetchJson<Posting>(endpoint(studio.id) + '/' + encodeURIComponent(id))
  const job = listing(raw, studio.id, studio.name, studio.home, studio.id)
  if (!job || job.externalId !== id) throw Object.assign(Error('Студия сняла объявление'), { status: 410 })
  return { description: job.description, department: job.department, url: job.url, verifiedAt: job.verifiedAt }
}
