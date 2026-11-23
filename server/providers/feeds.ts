import * as cheerio from 'cheerio'
import type { Vacancy } from '../../src/types'
import { emptySalary } from '../../src/types'
import { fetchJson, fetchText, plainText, safeUrl } from '../http'
import { detectDomain, inferLocation } from '../normalize'

interface JobicyJob {
  id: number
  url: string
  jobSlug: string
  jobTitle: string
  companyName: string
  companyLogo?: string
  jobIndustry?: string[]
  jobType?: string[]
  jobGeo?: string
  jobLevel?: string
  jobExcerpt?: string
  jobDescription?: string
  pubDate?: string
}

export async function fetchJobicy(): Promise<Vacancy[]> {
  const data = await fetchJson<{ jobs: JobicyJob[] }>('https://jobicy.com/api/v2/remote-jobs?count=60')
  return data.jobs.map((job) => {
    const description = plainText(job.jobDescription ?? job.jobExcerpt)
    const location = inferLocation(job.jobGeo, true)
    const tags = [...(job.jobIndustry ?? []), ...(job.jobType ?? []), job.jobLevel].filter((tag): tag is string => Boolean(tag))
    return {
      id: `jobicy:${job.id}`, externalId: String(job.id), source: 'jobicy', sourceName: 'Jobicy', sourceUrl: 'https://jobicy.com',
      title: job.jobTitle, company: job.companyName, companyLogo: safeUrl(job.companyLogo, ''), description,
      city: location.city, country: location.country, countryCode: location.countryCode, workFormat: 'remote',
      domain: detectDomain(job.jobTitle, description, tags), salary: { ...emptySalary },
      publishedAt: job.pubDate ?? null, verifiedAt: new Date().toISOString(), url: safeUrl(job.url, 'https://jobicy.com'), applyUrl: safeUrl(job.url, 'https://jobicy.com'),
      tags, isDemo: false, isTelegram: false,
    }
  })
}

export async function fetchWeWorkRemotely(): Promise<Vacancy[]> {
  const xml = await fetchText('https://weworkremotely.com/categories/remote-programming-jobs.rss', { Accept: 'application/rss+xml, application/xml, text/xml' })
  const $ = cheerio.load(xml, { xmlMode: true })
  const jobs: Vacancy[] = []
  $('item').each((index, element) => {
    const item = $(element)
    const rawTitle = item.find('title').first().text().trim()
    const url = safeUrl(item.find('link').first().text().trim(), 'https://weworkremotely.com')
    const description = plainText(item.find('description').first().text())
    const [company, role] = rawTitle.includes(':') ? rawTitle.split(/:(.+)/) : ['We Work Remotely', rawTitle]
    const title = (role ?? rawTitle).trim()
    const location = inferLocation(item.find('region').first().text(), true)
    const tags = item.find('category').map((_, category) => $(category).text().trim()).get().filter(Boolean)
    const externalId = url.split('/').filter(Boolean).pop() ?? String(index)
    jobs.push({
      id: `wwr:${externalId}`, externalId, source: 'wwr', sourceName: 'We Work Remotely', sourceUrl: 'https://weworkremotely.com',
      title, company: company.trim(), companyLogo: null, description,
      city: null, country: location.country, countryCode: location.countryCode, workFormat: 'remote',
      domain: detectDomain(title, description, tags), salary: { ...emptySalary },
      publishedAt: item.find('pubDate').first().text().trim() || null,
      verifiedAt: new Date().toISOString(), url, applyUrl: url,
      tags, isDemo: false, isTelegram: false,
    })
  })
  return jobs
}
