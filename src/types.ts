export const sourceIds = ['hh', 'remotive', 'remoteok', 'arbeitnow', 'jobicy', 'wwr', 'greenhouse', 'ashby', 'lever', 'telegram', 'egis', 'sixt', 'endava', 'aecom', 'ramboll', 'trudvsem', 'habr', 'superjob', 'yandex', 'kaspersky', 'ubisoft', 'gameloft', 'cdprojekt', 'peoplecanfly', 'epicgames', 'riotgames', '2k'] as const
export type SourceId = typeof sourceIds[number]
export const domains = ['bim', 'it', 'design', '3d', 'animation', 'other'] as const
export type Domain = typeof domains[number]
export type WorkFormat = 'remote' | 'hybrid' | 'office' | 'unspecified'
export type SourceStatus = 'online' | 'degraded' | 'unavailable' | 'disabled'

export interface Salary {
  text: string | null
  min: number | null
  max: number | null
  currency: string | null
  period: 'hour' | 'month' | 'year' | 'not_specified'
  taxBasis: 'gross' | 'net' | 'not_specified'
}

export interface Vacancy {
  id: string
  externalId: string
  source: SourceId
  sourceName: string
  sourceUrl: string
  title: string
  company: string
  companyLogo: string | null
  description: string
  city: string | null
  country: string | null
  countryCode: string | null
  workFormat: WorkFormat
  domain: Domain
  salary: Salary
  publishedAt: string | null
  validThrough?: string
  verifiedAt: string
  url: string
  applyUrl: string
  tags: string[]
  isDemo: boolean
  employment?: string
  experience?: string
  industry?: string
  department?: string
  address?: string
  detailPending?: boolean
  matchedQuery?: string
  isTelegram: boolean
}

export interface SearchFilters {
  skill?: string
  withSalary?: string
  postedWithin?: string
  city?: string
  q: string
  domain: 'all' | Domain
  workFormat: 'all' | WorkFormat
  country: string
  source: 'all' | SourceId | `telegram:${string}`
  sort: 'relevance' | 'recent'
}

export interface SourceHealth {
  id: string
  name: string
  kind: 'job-board' | 'ats' | 'telegram' | 'restricted'
  homeUrl: string
  status: SourceStatus
  count: number
  error: string | null
  fetchedAt: string | null
  note: string
}

export interface CountryFacet {
  code: string
  name: string
  count: number
}

export interface VacancyResponse {
  items: Vacancy[]
  total: number
  fetchedAt: string | null
  sources: SourceHealth[]
  facets: {
    skills?: { name: string; count: number }[]
    countries: CountryFacet[]
    domains: { id: Domain; count: number }[]
  }
}

export const emptySalary: Salary = {
  text: null,
  min: null,
  max: null,
  currency: null,
  period: 'not_specified',
  taxBasis: 'not_specified',
}

export interface ProviderDefinition {
  id: SourceHealth['id']
  name: string
  kind: SourceHealth['kind']
  homeUrl: string
  note: string
  queryAware?: boolean
  cacheTtlMs: number
  fetch: (filters: SearchFilters) => Promise<Vacancy[]>
}
