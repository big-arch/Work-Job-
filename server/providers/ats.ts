import type { Vacancy } from '../../src/types'
import { greenhouseListings } from './greenhouse'
import { PartialListings } from '../partialListings'
import { numericSalary } from '../salary'
import { emptySalary } from '../../src/types'
import { fetchJson, plainText, safeUrl } from '../http'
import { detectDomain, inferLocation, inferWorkFormat } from '../normalize'
import { appConfig } from '../config'

const now = () => new Date().toISOString()
const displayName = (value: string) => value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

function fetchGreenhouseBoard(board: string) {
  const name = board === 'discord' ? 'Discord' : displayName(board)
  const home = board === 'discord' ? 'https://discord.com/careers' : 'https://job-boards.greenhouse.io/' + encodeURIComponent(board)
  return greenhouseListings(board, name, home, 'greenhouse')
}

interface AshbyJob {
  title: string
  location?: string
  department?: string
  team?: string
  workplaceType?: string
  descriptionPlain?: string
  publishedAt?: string
  employmentType?: string
  address?: { postalAddress?: { addressCountry?: string; addressLocality?: string } }
  jobUrl: string
  applyUrl?: string
  isListed?: boolean
  compensation?: { compensationTierSummary?: string; scrapeableCompensationSalarySummary?: string; summaryComponents?: {compensationType:string;interval:string;currencyCode:string;minValue?:number;maxValue?:number}[] }
}

async function fetchAshbyBoard(board: string): Promise<Vacancy[]> {
  const data = await fetchJson<{ jobs: AshbyJob[] }>(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`)
  const company = board === 'linear' ? 'Linear' : displayName(board)
  const sourceUrl = `https://jobs.ashbyhq.com/${encodeURIComponent(board)}`
  return data.jobs.filter((job) => job.isListed !== false).map((job, index) => {
    const description = plainText(job.descriptionPlain)
    const workFormat = inferWorkFormat(job.location, job.workplaceType)
    const location = inferLocation(job.location ?? job.address?.postalAddress?.addressCountry, workFormat === 'remote')
    const tags = [job.department, job.team, job.employmentType].filter((tag): tag is string => Boolean(tag))
    const id = job.jobUrl.split('/').filter(Boolean).pop() ?? String(index)
    const base = job.compensation?.summaryComponents?.filter(c=>c.compensationType==='Salary')
    const component = base?.length === 1 ? base[0] : undefined
    const salary = numericSalary(component?.minValue,component?.maxValue,component?.currencyCode,component?.interval)
    const salaryText = job.compensation?.scrapeableCompensationSalarySummary ?? job.compensation?.compensationTierSummary ?? null
    return {
      id: `ashby:${board}:${id}`, externalId: `${board}:${id}`, source: 'ashby', sourceName: `Ashby · ${company}`, sourceUrl,
      title: job.title, company, companyLogo: null, description,
      city: location.city, country: location.country, countryCode: location.countryCode, workFormat,
      domain: detectDomain(job.title, description, tags), salary: salary.text ? salary : {...salary,text:salaryText},
      publishedAt: job.publishedAt ?? null, verifiedAt: now(), url: safeUrl(job.jobUrl, sourceUrl), applyUrl: safeUrl(job.applyUrl, safeUrl(job.jobUrl, sourceUrl)),
      tags, isDemo: false, isTelegram: false,
    }
  })
}

interface LeverJob {
  id: string
  text: string
  categories?: { location?: string; commitment?: string; team?: string; department?: string }
  country?: string
  openingPlain?: string
  descriptionPlain?: string
  hostedUrl: string
  applyUrl?: string
  workplaceType?: string
  salaryRange?: { currency?: string; interval?: string; min?: number; max?: number }
  createdAt?: number
}

async function fetchLeverBoard(board: string): Promise<Vacancy[]> {
  const data = await fetchJson<LeverJob[]>(`https://api.lever.co/v0/postings/${encodeURIComponent(board)}?mode=json&limit=60`)
  const demo = board === 'leverdemo'
  const company = demo ? 'Lever Demo' : displayName(board)
  const sourceUrl = `https://jobs.lever.co/${encodeURIComponent(board)}`
  return data.map((job) => {
    const description = plainText(job.descriptionPlain ?? job.openingPlain)
    const workFormat = inferWorkFormat(job.categories?.location, job.workplaceType)
    const location = inferLocation(job.categories?.location ?? job.country, workFormat === 'remote')
    const tags = [job.categories?.team, job.categories?.department, job.categories?.commitment].filter((tag): tag is string => Boolean(tag))
    const range = job.salaryRange
    const salaryText = range?.min || range?.max ? `${range.min?.toLocaleString('en-US') ?? ''}${range.max ? ` – ${range.max.toLocaleString('en-US')}` : ''} ${range.currency ?? ''}`.trim() : null
    return {
      id: `lever:${board}:${job.id}`, externalId: `${board}:${job.id}`, source: 'lever', sourceName: `Lever · ${company}`, sourceUrl,
      title: job.text, company, companyLogo: null, description,
      city: location.city, country: location.country, countryCode: job.country ?? location.countryCode, workFormat,
      domain: detectDomain(job.text, description, tags),
      salary: { ...emptySalary, text: salaryText, min: range?.min ?? null, max: range?.max ?? null, currency: range?.currency ?? null, period: range?.interval === 'year' ? 'year' : range?.interval === 'month' ? 'month' : range?.interval === 'hour' ? 'hour' : 'not_specified' },
      publishedAt: job.createdAt ? new Date(job.createdAt).toISOString() : null, verifiedAt: now(), url: safeUrl(job.hostedUrl, sourceUrl), applyUrl: safeUrl(job.applyUrl, safeUrl(job.hostedUrl, sourceUrl)),
      tags, isDemo: demo, isTelegram: false,
    }
  })
}

export const atsProviders = {
  greenhouse: async () => (await Promise.all(appConfig.greenhouseBoards.map(fetchGreenhouseBoard))).flat(),
  ashby: async () => {
    const results = await Promise.allSettled(appConfig.ashbyBoards.map(fetchAshbyBoard))
    const jobs = results.flatMap(result=>result.status==='fulfilled'?result.value:[])
    if(results.some(result=>result.status==='rejected')) throw new PartialListings(jobs)
    return jobs
  },
  lever: async () => (await Promise.all(appConfig.leverBoards.map(fetchLeverBoard))).flat(),
}

export type AtsProviderName = keyof typeof atsProviders
