import * as cheerio from 'cheerio'
import { emptySalary, type SearchFilters, type Vacancy } from '../../src/types'
import { fetchJson, fetchText, plainText } from '../http'
import { detectDomain, inferLocation, inferWorkFormat, normalizeSearch } from '../normalize'
import { mapLimit } from '../mapLimit'
import { readHabrPosting, salaryFromPosting } from './russianEmployers'
import { appConfig } from '../config'

export async function fetchHabr(filters: SearchFilters): Promise<Vacancy[]> {
  const jobs = new Map<string, Vacancy>()
  const query = normalizeSearch(filters.q)
  for (let page=1; page <= (query ? 4 : 60); page++) {
    const params = new URLSearchParams({page:String(page),per_page:'25'})
    if (query) params.set('q',query)
    const xml = await fetchText('https://career.habr.com/vacancies/rss?' + params, { Accept: 'application/rss+xml, application/xml' }, 8000)
    const $ = cheerio.load(xml, {xmlMode:true})
    if (!$('rss>channel').length) throw Error('Источник вернул ответ без RSS')
    const prior=jobs.size
    const items=$('item').toArray()
    for (const el of items) {
      const node=$(el)
      const get=(key:string)=>node.children(key).first().text().trim()
      const url=get('link')
      const id=url.match(/^https:\/\/career\.habr\.com\/vacancies\/(\d+)\/?$/)?.[1]
      if (!id) continue
      const raw=get('title')
      const title=raw.match(/«(.+?)»/)?.[1] || raw
      const description=plainText(get('description'))
      const format=inferWorkFormat(description)
      const city=raw.match(/\(([^()]+)\)\s*$/)?.[1] || description.match(/(?:^|[.!?]\s+)([\p{Lu}][\p{L}\s-]{1,60})\s+\(Россия\)/u)?.[1]
      const tags=Array.from(description.matchAll(/#([\p{L}\d+#.]+)/gu),m=>m[1])
      const location=inferLocation(city,format==='remote')
      if (/\(Россия\)/i.test(description)) { location.countryCode='RU';location.country='Россия' }
      const date=Date.parse(get('pubDate'))
      jobs.set(id,{id:'habr:'+id,externalId:id,source:'habr',sourceName:'Хабр Карьера',sourceUrl:'https://career.habr.com',url,applyUrl:url,
        title,company:get('author')||'Работодатель не указан',companyLogo:null,description,...location,workFormat:format,
        domain:detectDomain(title,description,tags),salary:{...emptySalary},tags,matchedQuery:query,
        publishedAt:Number.isFinite(date)?new Date(date).toISOString():null,verifiedAt:new Date().toISOString(),isTelegram:false,isDemo:false})
    }
    if(items.length<25||prior===jobs.size) break
  }
  const rows = await mapLimit([...jobs.values()], 3, enrichHabr)
  return rows.filter((job): job is Vacancy => job !== null)
}

const harbDetails = new Map<string, {until:number; fields:Promise<Partial<Vacancy> | null>}>()
async function enrichHabr(job: Vacancy): Promise<Vacancy | null> {
  // RSS is the live index. Fetch the employer's structured data for pay and older listings.
  const dated = Date.parse(job.publishedAt || '')
  const salaryMention = /\d\s*(?:₽|руб\.?|₸|€|\$|USD|EUR|RUB)(?:\s|[.,]|$)/i.test(job.description)
  if (!salaryMention && Number.isFinite(dated) && Date.now()-dated < 25*86400_000) return job
  const known = harbDetails.get(job.id)
  if (known && known.until > Date.now()) {
    const fields = await known.fields
    return fields ? {...job,...fields} : null
  }
  const fields = readHabrPosting(job.externalId).then(post=>({
    description:plainText(post.description,32000) || job.description,
    validThrough:post.validThrough,salary:salaryFromPosting(post),
    employment:typeof post.employmentType === 'string' ? post.employmentType : undefined,
  })).catch(error => [404,410].includes(error?.status) || !Number.isFinite(dated) || Date.now()-dated>30*86400_000 ? null : {})
  for (const [key,value] of harbDetails) if(value.until<=Date.now()) harbDetails.delete(key)
  harbDetails.set(job.id, {until:Date.now()+10*60_000,fields})
  const result = await fields
  return result ? {...job,...result} : null
}

interface SjJob {
  id:number; profession:string; firm_name?:string; client?:{title?:string}; town?:{title?:string}; country?:{title?:string};
  vacancyRichText?:string; candidat?:string; work?:string; compensation?:string; link:string; payment_from?:number;payment_to?:number;
  currency?:string;date_published?:number;type_of_work?:{title?:string}; is_archive?:boolean; profession_alt?:string;
  place_of_work?:{title?:string}; experience?:{title?:string}; published?:number
}
const sjBase='https://api.superjob.ru/2.0/vacancies/'
const sjHeaders=()=>({'X-Api-App-Id':appConfig.superJobKey})
const sjDescription=(job:SjJob)=>plainText(job.vacancyRichText || [job.work,job.candidat,job.compensation].filter(Boolean).join('\n\n'),120000)
export async function fetchSuperjob(filters:SearchFilters):Promise<Vacancy[]> {
  const jobs:Vacancy[]=[]
  const params=new URLSearchParams({keyword:filters.q.trim()||'BIM',count:'100'})
  for(let page=0;page<5;page++){
    params.set('page',String(page))
    const result=await fetchJson<{objects:SjJob[];more:boolean}>(sjBase+'?'+params,sjHeaders())
    for(const job of result.objects){
      if(job.is_archive || !/^https:\/\/(?:[a-z0-9-]+\.)*superjob\.ru\/vakansii\//i.test(job.link))continue
      const description=sjDescription(job)
      const salary=[job.payment_from?'от '+job.payment_from:null,job.payment_to?'до '+job.payment_to:null].filter(Boolean).join(' ')
      const location=inferLocation([job.town?.title,job.country?.title].filter(Boolean).join(', '))
      jobs.push({id:'superjob:'+job.id,externalId:String(job.id),source:'superjob',sourceName:'SuperJob',sourceUrl:'https://www.superjob.ru',url:job.link,applyUrl:job.link,
        title:job.profession,company:job.firm_name||job.client?.title||'Работодатель не указан',companyLogo:null,description,...location,city:job.town?.title||location.city,
        salary:{...emptySalary,min:job.payment_from||null,max:job.payment_to||null,currency:job.currency||null,text:salary?[salary,job.currency].filter(Boolean).join(' '):null},
        workFormat:inferWorkFormat(job.place_of_work?.title),domain:detectDomain(job.profession,description),tags:[],detailPending:true,isTelegram:false,isDemo:false,
        publishedAt:job.date_published?new Date(job.date_published*1000).toISOString():null,verifiedAt:new Date().toISOString()})
    }
    if(!result.more||!result.objects.length)break
  }
  return jobs
}
export async function superjobDetail(id:string){
  if(!appConfig.superJobKey) throw Error('Доступ SuperJob не настроен')
  const job=await fetchJson<SjJob>(sjBase+id+'/',sjHeaders())
  if(String(job.id)!==id||job.is_archive||job.published===0)throw Object.assign(Error('Вакансия снята'),{status:410})
  return {description:sjDescription(job),url:job.link,verifiedAt:new Date().toISOString(),employment:job.type_of_work?.title,experience:job.experience?.title}
}
