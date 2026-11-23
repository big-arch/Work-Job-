import { emptySalary, type SearchFilters, type Vacancy } from '../../src/types'
import { fetchJson, plainText } from '../http'
import { detectDomain, inferWorkFormat } from '../normalize'

interface Job {
  id: string
  'job-name'?: string
  vac_url?: string
  company?: { name?: string }
  duty?: string
  requirement?: { qualification?: string }
  terms?: string
  salary?: string
  schedule?: string
  region?: { name?: string }
  'creation-date'?: string
}
export async function fetchTrudvsem(filters: SearchFilters) {
  const jobs: Vacancy[] = []
  const params = new URLSearchParams({ text: filters.q.trim() || 'BIM', limit: '100' })
  for (let page = 0; page < 100; page++) {
    params.set('offset', String(page))
    const result = await fetchJson<{ status: string; meta: { total: number }; results: { vacancies?: {vacancy: Job}[] } }>(
      'https://opendata.trudvsem.ru/api/v1/vacancies?' + params, {}, 5500)
    if (String(result.status) !== '200') throw Error('Сервис «Работа России» не предоставил данные')
    const entries = result.results.vacancies ?? []
    for (const { vacancy: job } of entries) {
      if (!job.id || !job['job-name'] || !job.vac_url || !/^https?:\/\/(?:www\.)?trudvsem\.ru\/vacancy\//i.test(job.vac_url)) continue
      const url = job.vac_url.replace(/^http:/, 'https:')
      const description = [job.duty, job.requirement?.qualification, job.terms].map(value => plainText(value, 100000)).filter(Boolean).join('\n\n')
      jobs.push({ id: 'trudvsem:' + job.id, externalId: job.id, source: 'trudvsem', sourceName: 'Работа России', sourceUrl: 'https://trudvsem.ru',
        title: job['job-name'], company: job.company?.name || 'Работодатель не указан', companyLogo: null, description,
        city: null, country: 'Россия', countryCode: 'RU', workFormat: inferWorkFormat(job.schedule),
        domain: detectDomain(job['job-name'], description), salary: { ...emptySalary, text: job.salary || null },
        publishedAt: job['creation-date'] || null, verifiedAt: new Date().toISOString(), url, applyUrl: url,
        tags: [], isDemo: false, isTelegram: false })
    }
    if (entries.length < 100 || (page + 1) * 100 >= Number(result.meta.total)) break
  }
  return jobs
}
