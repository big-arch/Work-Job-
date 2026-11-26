import { type SearchFilters, type Vacancy } from '../../src/types'
import { fetchJson, plainText } from '../http'
import { detectDomain, inferWorkFormat, normalizeSearch } from '../normalize'
import { creativeQuery } from '../../src/lib/creativeRoles'
import { numericSalary } from '../salary'
import { PartialListings } from '../partialListings'
import { registryUrl } from '../../src/lib/trudLink'
import { mapLimit } from '../mapLimit'

const api = 'https://opendata.trudvsem.ru/api/v1/vacancies'
const pageSize = 100
const artQueries = ['3D-художник', '3D-визуализатор', '3D-моделлер']
const animationQueries = ['художник-аниматор', 'моушн-дизайнер']
export const rosterQueries = ['BIM', 'Revit', 'проектировщик', 'инженер-конструктор', 'архитектор', 'сметчик', 'инженер ПТО', 'разработчик', 'программист', 'дизайнер', ...artQueries, ...animationQueries] as const
interface Job {
  id: string
  'job-name'?: string
  vac_url?: string
  company?: { name?: string }
  duty?: string
  requirements?: string
  qualification?: string
  requirement?: { qualification?: string; experience?: number }
  term?: { text?: string }
  salary?: string
  salary_min?: number
  salary_max?: number
  currency?: string
  schedule?: string
  employment?: string
  region?: { name?: string }
  addresses?: { address?: {location?: string}[] }
  'creation-date'?: string
  skills?: string[]
}

interface Response { status: string | number; meta?: {total?: number}; results?: { vacancies?: {vacancy: Job}[] } }

function vacancy(job: Job): Vacancy | null {
  const path = job.vac_url?.match(/^https?:\/\/(?:www\.)?trudvsem\.ru\/vacancy\/card\/([a-z\d-]+)\/([a-z\d-]+)\/?$/i)
  if (!path || !job.id || path[2] !== job.id || !job['job-name']?.trim()) return null
  const url = 'https://trudvsem.ru/vacancy/card/' + path[1] + '/' + path[2]
  const title = job['job-name'].trim()
  const parts = [
    ['Обязанности', job.duty],
    ['Требования', job.requirements || job.qualification || job.requirement?.qualification],
    ['Условия', job.term?.text],
  ]
  const description = parts.filter(([,value]) => value).map(([key,value])=>key + '\n' + plainText(value)).join('\n\n')
  const address = job.addresses?.address?.[0]?.location
  const city = address?.match(/(?:^|,\s*)(?:г\.?\s+|город\s+)([^,;]+)/i)?.[1]?.trim()
  const salary = numericSalary(job.salary_min, job.salary_max === job.salary_min && /^от\s/i.test(job.salary ?? '') ? null : job.salary_max, job.currency)
  const tags = (Array.isArray(job.skills) ? job.skills : []).filter(t => typeof t === 'string')
  return {
    id: 'trudvsem:' + job.id, externalId: job.id, source: 'trudvsem', sourceName: 'Работа России', sourceUrl: 'https://trudvsem.ru',
    title, company: job.company?.name || 'Работодатель не указан', companyLogo: null, description,
    city: city || null, address: [city ? undefined : job.region?.name, address].filter(Boolean).join(' · ') || undefined,
    country: 'Россия', countryCode:'RU', workFormat:inferWorkFormat(job.schedule), domain:detectDomain(title, description, tags),
    salary: salary.text ? salary : {...salary, text:job.salary || null}, employment: job.employment,
    publishedAt: job['creation-date'] || null, verifiedAt:new Date().toISOString(), url, applyUrl:url, tags, isDemo:false, isTelegram:false,
  }
}

async function readPage(query: string, index: number) {
  const params = new URLSearchParams({text:query, limit:String(pageSize),offset:String(index)})
  const url = api + '?' + params
  let result: Response
  try { result = await fetchJson<Response>(url, {}, 30_000) }
  catch (error) {
    const status = (error as {status?:number}).status
    if (status && status < 500) throw error
    result = await fetchJson<Response>(url, {}, 30_000)
  }
  if (Number(result.status) !== 200 || !Number.isFinite(result.meta?.total)) throw Error('Роструд не подтвердил выдачу')
  return { count: Number(result.meta!.total), rows: result.results?.vacancies ?? [] }
}

export async function trudQuery(query: string, pageLimit: number) {
  const first = await readPage(query, 0)
  const pages = Math.min(pageLimit, Math.ceil(first.count / pageSize))
  let incomplete = false
  const remainder = await mapLimit(Array.from({length:Math.max(0,pages-1)}, (_,i)=>i+1),2, async index=>{
    try { return await readPage(query,index) } catch { incomplete = true; return {rows:[]} }
  })
  const jobs = [first,...remainder].flatMap(page=>page.rows.map(entry=>vacancy(entry.vacancy)).filter((v): v is Vacancy=>v!==null))
  if (incomplete) throw new PartialListings(jobs)
  return jobs
}

export async function fetchTrudvsem(filters: SearchFilters) {
  if (filters.q.trim()) {
    const query=normalizeSearch(filters.q)
    const creative = creativeQuery(query)
    const queries = query==='bim' ? ['BIM','Revit','информационное моделирование'] :
      creative.includes('animation') ? animationQueries : creative.includes('3d') ? artQueries : []
    if (!queries.length) return trudQuery(filters.q.trim(),100)
    const results=await Promise.allSettled(queries.map(q=>trudQuery(q,100)))
    const jobs=results.flatMap(r=>r.status==='fulfilled'?r.value:r.reason instanceof PartialListings?r.reason.jobs:[])
    const unique=[...new Map(jobs.map(j=>[j.id,j])).values()]
    if(results.some(r=>r.status==='rejected')) throw new PartialListings(unique)
    return unique
  }
  let incomplete = false
  const groups = await mapLimit(rosterQueries, 2, async query=>{
    try { return await trudQuery(query,6) } catch (error) {
      incomplete = true
      return error instanceof PartialListings ? error.jobs : []
    }
  })
  const jobs = [...new Map(groups.flat().map(job=>[job.id,job])).values()]
  if (incomplete) throw new PartialListings(jobs)
  return jobs
}

export async function trudDetail(key: string) {
  const url=registryUrl(key)
  if (!url) throw Error('Некорректный номер записи Роструда')
  const result=await fetchJson<Response>(url,{},24_000)
  const rows=result.results?.vacancies
  if (Number(result.status)===404 || (Number(result.status)===200 && Array.isArray(rows) && !rows.length))
    throw Object.assign(Error('Вакансия больше не публикуется'),{status:410})
  const record=rows?.find(row=>row.vacancy?.id===key.split(':')[1])
  const job=record && vacancy(record.vacancy)
  if (Number(result.status)!==200 || !job) throw Error('Реестр не подтвердил данные')
  return {description:job.description,verifiedAt:job.verifiedAt,url:job.url,pay:job.salary.text ?? undefined,address:job.address,employment:job.employment}
}
