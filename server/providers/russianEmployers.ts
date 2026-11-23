import { load } from 'cheerio'
import { emptySalary, type ProviderDefinition, type Vacancy } from '../../src/types'
import { withinDeadline } from '../../src/lib/freshness'
import { fetchText, plainText } from '../http'
import { detectDomain, inferLocation, inferWorkFormat } from '../normalize'
import { PartialListings } from '../partialListings'
import { mapLimit } from '../mapLimit'
import { numericSalary } from '../salary'

interface Posting {
  '@type'?: string
  title?: string
  description?: string
  employmentType?: string | string[]
  qualifications?: string
  skills?: string | string[]
  datePosted?: string
  validThrough?: string
  jobLocationType?: string
  jobLocation?: Place | Place[]
  hiringOrganization?: {name?:string}
  identifier?: {value?:string | number}
  baseSalary?: {currency?:string; value?:{value?:number;minValue?:number;maxValue?:number;unitText?:string}}
}
interface Place {address?: string | {addressCountry?:string;addressLocality?:string}}
const yandex = 'https://yandex.ru'
const kaspersky = 'https://careers.kaspersky.ru'
const html = (url: string) => fetchText(url, {Accept:'text/html'}, 15_000)
const countries = new Intl.DisplayNames(['ru'], {type:'region'})
const expired = () => Object.assign(Error('Публикация закрыта'), {status:410})

function postingState(markup: string, id: string) {
  const $ = load(markup)
  if (/вакансия (?:находится )?в архиве|вакансия (?:закрыта|снята)/i.test($('h1,h2,[class*="archive" i]').text())) throw expired()
  for (const element of $('script[type="application/ld+json"]').toArray()) {
    let payload
    try { payload = JSON.parse($(element).text()) } catch { continue }
    const records = Array.isArray(payload) ? payload : payload?.['@graph'] ?? [payload]
    for (const post of records as Posting[]) {
      if (post?.['@type'] !== 'JobPosting' || String(post.identifier?.value) !== id || !post.title?.trim()) continue
      if (!withinDeadline(post.validThrough)) throw expired()
      return post
    }
  }
  throw Error('Страница не подтвердила действующую вакансию')
}

export function salaryFromPosting(post: Posting) {
  const value = post.baseSalary?.value
  return numericSalary(value?.minValue ?? value?.value, value?.maxValue ?? value?.value, post.baseSalary?.currency, value?.unitText)
}

export async function readHabrPosting(id: string) {
  return postingState(await html('https://career.habr.com/vacancies/' + id), id)
}

function links(page: string, base: string, pattern: RegExp) {
  const $ = load(page)
  return [...new Set($('a[href]').map((_,e)=>$(e).attr('href') || '').get()
    .filter(href => pattern.test(href)).map(href => new URL(href,base).href))]
}

async function collect(index: string, sections: RegExp, jobs: RegExp, read: (url:string)=>Promise<Vacancy>) {
  const first = await html(index)
  const urls = new Set(links(first,index,jobs))
  if (!urls.size) throw Error('Список открытых вакансий недоступен')
  const subpages = links(first,index,sections)
  let incomplete = false
  await mapLimit(subpages, 2, async url => {
    try { for (const job of links(await html(url),index,jobs)) urls.add(job) }
    catch { incomplete = true }
  })
  const results = await mapLimit([...urls], 3, async url => {
    try { return await read(url) }
    catch (e) {
      if (![404,410].includes((e as {status?:number}).status ?? 0)) incomplete = true
      return null
    }
  })
  const confirmed = results.filter((job): job is Vacancy => job !== null)
  if (incomplete) throw new PartialListings(confirmed)
  return confirmed
}


async function yandexVacancy(url: string): Promise<Vacancy> {
  const id = url.match(/-(\d+)$/)![1]
  const post = postingState(await html(url), id)
  const title = plainText(post.title)
  const places = Array.isArray(post.jobLocation) ? post.jobLocation : post.jobLocation ? [post.jobLocation] : []
  const addresses = places.flatMap(p => typeof p.address === 'object' ? [p.address] : [])
  const cities = [...new Set(addresses.map(a=>a.addressLocality).filter(Boolean))]
  const codes = [...new Set(addresses.map(a=>a.addressCountry?.toUpperCase()).filter((c):c is string=>!!c && /^[A-Z]{2}$/.test(c)))]
  const countryCode = codes.length === 1 ? codes[0] : null
  const tags = (Array.isArray(post.skills) ? post.skills : post.skills?.split(/[,;]/) ?? []).map(skill=>plainText(skill)).filter(Boolean)
  const description = [plainText(post.description), plainText(post.qualifications)].filter(Boolean).join('\n\n')
  return {id:'yandex:'+id, externalId:id, source:'yandex',sourceName:'Карьера в Яндексе',sourceUrl:yandex+'/jobs',url,applyUrl:url,
    title, company:post.hiringOrganization?.name || 'Яндекс',companyLogo:null,description,city:cities.join(', ') || null,
    country:codes.map(c=>countries.of(c)).join(', ') || null,countryCode,workFormat:post.jobLocationType==='TELECOMMUTE'?'remote':inferWorkFormat(post.jobLocationType),
    domain:detectDomain(title,description,tags),salary:salaryFromPosting(post),tags,publishedAt:post.datePosted || null,validThrough:post.validThrough,
    verifiedAt:new Date().toISOString(),isDemo:false,isTelegram:false}
}

async function kasperskyVacancy(url: string): Promise<Vacancy> {
  const id = url.split('/').pop()!
  const $ = load(await html(url))
  const title = $('[data-testid="vacancy-title"]').first().text().trim()
  if (!title || !$('[data-testid="vacancy-apply-button"]').length) throw Error('Страница без открытого отклика')
  const scope = $('[data-testid="vacancy-body"]').first()
  const description = plainText(scope.html())
  if (!description) throw Error('Описание недоступно')
  const country = $('[data-testid^="vacancy-tag-country-"]').first().text().trim()
  const city = $('[data-testid^="vacancy-tag-city-"]').first().text().trim()
  const geo = inferLocation(country || city)
  return {id:'kaspersky:'+id,externalId:id,source:'kaspersky',sourceName:'Карьера в Лаборатории Касперского',sourceUrl:kaspersky,url,applyUrl:url,
    title,company:'Лаборатория Касперского',companyLogo:null,description,city:city||null,country:geo.country||country||null,countryCode:geo.countryCode,
    workFormat:inferWorkFormat(title),domain:detectDomain(title,description),salary:{...emptySalary},tags:[],publishedAt:null,verifiedAt:new Date().toISOString(),isDemo:false,isTelegram:false}
}

export const russianEmployers: ProviderDefinition[] = [
  {id:'yandex',name:'Яндекс',homeUrl:yandex+'/jobs/vacancies',kind:'ats',cacheTtlMs:2*3600_000,
    note:'Карьерный сайт и разделы профессий. В каталоге только карточки с действующей разметкой JobPosting.',
    fetch:()=>collect(yandex+'/jobs/vacancies',/^\/jobs\/vacancies\?profession=(?:backend-developer|analyst|designer-uxui|project-manager)(?:&|$)/,
      /^\/jobs\/vacancies\/[\w-]+-\d+$/,yandexVacancy)},
  {id:'kaspersky',name:'Лаборатория Касперского',homeUrl:kaspersky+'/vacancies',kind:'ats',cacheTtlMs:2*3600_000,
    note:'Карьерный сайт и разделы направлений. При сверке проверяются текст вакансии и наличие кнопки отклика.',
    fetch:()=>collect(kaspersky+'/vacancies',/^\/vacancies\?category=\d+$/,/^\/vacancy\/[a-z\d]+$/,kasperskyVacancy)},
]
