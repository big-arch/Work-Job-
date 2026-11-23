import type { Salary, SearchFilters, Vacancy } from '../../src/types'
import { emptySalary } from '../../src/types'
import { fetchJson, plainText, safeUrl } from '../http'
import { detectDomain, inferLocation, inferWorkFormat } from '../normalize'
import { appConfig } from '../config'

const now = () => new Date().toISOString()
const salary = (text: string | null, values: Partial<Salary> = {}): Salary => ({ ...emptySalary, ...values, text })

interface HhItem {
  id: string
  name: string
  alternate_url: string
  published_at: string
  area?: { name?: string }
  employer?: { name?: string; logo_urls?: { original?: string } }
  snippet?: { requirement?: string; responsibility?: string }
  schedule?: { name?: string }
  salary?: { from?: number; to?: number; currency?: string; gross?: boolean }
  professional_roles?: { name?: string }[]
}

function hhHeaders() {
  return { 'HH-User-Agent': appConfig.hhUserAgent, Authorization: 'Bearer ' + appConfig.hhAccessToken }
}

export async function hhDetail(id: string) {
  if (!appConfig.hhAccessToken) throw Error('Доступ приложения к HH не настроен')
  const job = await fetchJson<{ id: string; archived: boolean; description: string; alternate_url: string; key_skills?: {name:string}[]; experience?:{name:string}; employment?:{name:string}; address?:{raw?:string} }>('https://api.hh.ru/vacancies/' + id, hhHeaders())
  if (job.archived || job.id !== id) throw Object.assign(Error('Вакансия в архиве'), {status: 410})
  return { skills:job.key_skills?.map(skill=>skill.name), employment:job.employment?.name, experience:job.experience?.name, address:job.address?.raw, description: plainText(job.description, 120_000), url: job.alternate_url, verifiedAt: now() }
}

export async function fetchHh(filters: SearchFilters): Promise<Vacancy[]> {
  const query = filters.q || 'BIM OR Revit OR developer OR разработчик'
  if (!appConfig.hhAccessToken) throw Error('Доступ приложения к HH не настроен')
  const jobs: HhItem[] = []
  const params = new URLSearchParams({ text: query, per_page: '100', order_by: 'publication_time' })
  for (let page = 0; page < 20; page++) {
    params.set('page', String(page))
    const result = await fetchJson<{items: HhItem[]; pages: number}>('https://api.hh.ru/vacancies?' + params, hhHeaders())
    jobs.push(...result.items)
    if (page + 1 >= result.pages) break
  }
  return jobs.map((job) => {
    const description = plainText(`${job.snippet?.responsibility ?? ''}\n${job.snippet?.requirement ?? ''}`)
    const workFormat = inferWorkFormat(job.schedule?.name)
    const location = inferLocation(job.area?.name, workFormat === 'remote')
    const tags = job.professional_roles?.map((role) => role.name).filter((tag): tag is string => Boolean(tag)) ?? []
    const currency = job.salary?.currency === 'RUR' ? 'RUB' : job.salary?.currency ?? null
    const text = job.salary
      ? `${job.salary.from ? `от ${job.salary.from.toLocaleString('ru-RU')}` : ''}${job.salary.to ? ` до ${job.salary.to.toLocaleString('ru-RU')}` : ''} ${job.salary.currency === 'RUR' ? '₽' : job.salary.currency ?? ''}`.trim()
      : null
    return {
      id: `hh:${job.id}`, externalId: job.id, source: 'hh', sourceName: 'HeadHunter', sourceUrl: 'https://hh.ru',
      title: job.name, company: job.employer?.name ?? 'Работодатель не указан', companyLogo: safeUrl(job.employer?.logo_urls?.original, ''),
      description, city: location.city, country: location.country, countryCode: location.countryCode,
      workFormat, domain: detectDomain(job.name, description, tags),
      salary: salary(text, { min: job.salary?.from ?? null, max: job.salary?.to ?? null, currency, period: 'month', taxBasis: job.salary?.gross === true ? 'gross' : job.salary?.gross === false ? 'net' : 'not_specified' }),
      publishedAt: job.published_at, verifiedAt: now(), url: safeUrl(job.alternate_url, 'https://hh.ru'), applyUrl: safeUrl(job.alternate_url, 'https://hh.ru'),
      detailPending: true, tags, isDemo: false, isTelegram: false,
    }
  })
}

interface RemotiveJob {
  id: number
  url: string
  title: string
  company_name: string
  company_logo?: string
  category?: string
  job_type?: string
  publication_date?: string
  candidate_required_location?: string
  salary?: string
  description?: string
}

export async function fetchRemotive(filters: SearchFilters): Promise<Vacancy[]> {
  const search = filters.q ? `&search=${encodeURIComponent(filters.q)}` : ''
  const data = await fetchJson<{ jobs: RemotiveJob[] }>(`https://remotive.com/api/remote-jobs?limit=100${search}`)
  return data.jobs.map((job) => {
    const description = plainText(job.description)
    const location = inferLocation(job.candidate_required_location, true)
    const tags = [job.category, job.job_type].filter((tag): tag is string => Boolean(tag))
    return {
      id: `remotive:${job.id}`, externalId: String(job.id), source: 'remotive', sourceName: 'Remotive', sourceUrl: 'https://remotive.com',
      title: job.title, company: job.company_name, companyLogo: safeUrl(job.company_logo, ''), description,
      city: location.city, country: location.country, countryCode: location.countryCode, workFormat: 'remote',
      domain: detectDomain(job.title, description, tags), salary: salary(plainText(job.salary, 300) || null),
      publishedAt: job.publication_date ?? null, verifiedAt: now(), url: safeUrl(job.url, 'https://remotive.com'), applyUrl: safeUrl(job.url, 'https://remotive.com'),
      tags, isDemo: false, isTelegram: false,
    }
  })
}

interface RemoteOkJob {
  id: string
  position?: string
  company?: string
  company_logo?: string
  description?: string
  tags?: string[]
  location?: string
  date?: string
  url?: string
  salary_min?: number
  salary_max?: number
}

export async function fetchRemoteOk(): Promise<Vacancy[]> {
  const data = await fetchJson<RemoteOkJob[]>('https://remoteok.com/api')
  return data.filter((job) => job.id && job.position).map((job) => {
    const description = plainText(job.description)
    const location = inferLocation(job.location, true)
    const tags = job.tags ?? []
    const salaryText = job.salary_min || job.salary_max ? `${job.salary_min ? `$${job.salary_min.toLocaleString('en-US')}` : ''}${job.salary_max ? ` – $${job.salary_max.toLocaleString('en-US')}` : ''}` : null
    return {
      id: `remoteok:${job.id}`, externalId: job.id, source: 'remoteok', sourceName: 'Remote OK', sourceUrl: 'https://remoteok.com',
      title: job.position ?? 'Без названия', company: job.company ?? 'Компания не указана', companyLogo: safeUrl(job.company_logo, ''), description,
      city: location.city, country: location.country, countryCode: location.countryCode, workFormat: 'remote',
      domain: detectDomain(job.position ?? '', description, tags),
      salary: salary(salaryText, { min: job.salary_min ?? null, max: job.salary_max ?? null, currency: salaryText ? 'USD' : null, period: salaryText ? 'year' : 'not_specified' }),
      publishedAt: job.date ?? null, verifiedAt: now(), url: safeUrl(job.url, 'https://remoteok.com'), applyUrl: safeUrl(job.url, 'https://remoteok.com'),
      tags, isDemo: false, isTelegram: false,
    }
  })
}

interface ArbeitnowJob {
  slug: string
  company_name: string
  title: string
  description: string
  remote: boolean
  url: string
  tags?: string[]
  location?: string
  created_at?: string | number
}

export async function fetchArbeitnow(): Promise<Vacancy[]> {
  const data = await fetchJson<{ data: ArbeitnowJob[] }>('https://www.arbeitnow.com/api/job-board-api')
  return data.data.slice(0, 150).map((job) => {
    const description = plainText(job.description)
    const workFormat = job.remote ? 'remote' : inferWorkFormat(job.location)
    const location = inferLocation(job.location, workFormat === 'remote')
    const tags = job.tags ?? []
    const publishedAt = typeof job.created_at === 'number' ? new Date(job.created_at * 1000).toISOString() : job.created_at ?? null
    return {
      id: `arbeitnow:${job.slug}`, externalId: job.slug, source: 'arbeitnow', sourceName: 'Arbeitnow', sourceUrl: 'https://www.arbeitnow.com',
      title: job.title, company: job.company_name, companyLogo: null, description,
      city: location.city, country: location.country, countryCode: location.countryCode, workFormat,
      domain: detectDomain(job.title, description, tags), salary: salary(null),
      publishedAt, verifiedAt: now(), url: safeUrl(job.url, 'https://www.arbeitnow.com'), applyUrl: safeUrl(job.url, 'https://www.arbeitnow.com'),
      tags, isDemo: false, isTelegram: false,
    }
  })
}
