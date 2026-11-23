import type { SearchFilters, SourceHealth, Vacancy, VacancyResponse } from '../types'
import { currentListing } from './freshness'
import { dedupeVacancies, filterAndSort } from '../../server/normalize'

export function catalogResponse(jobs:Vacancy[], filters:SearchFilters, sources:SourceHealth[], fetchedAt:string): VacancyResponse {
  const deduped = dedupeVacancies(jobs.filter(job => currentListing(job)))
  const domainFiltered = filterAndSort(deduped, { ...filters, workFormat: 'all', country: 'all' })
  const facets = {
    countries: Object.entries(domainFiltered.reduce<Record<string, { code: string; name: string; count: number }>>((acc, vacancy) => {
      if (!vacancy.country || !vacancy.countryCode) return acc
      const code = vacancy.countryCode
      acc[code] ??= { code, name: vacancy.country, count: 0 }
      acc[code].count += 1
      return acc
    }, {})).map(([, value]) => value).sort((a, b) => b.count - a.count),
    domains: (['it', 'bim', 'design','other'] as const).map((id) => ({ id, count: deduped.filter((vacancy) => vacancy.domain === id).length })),
  }
  const items = filterAndSort(deduped, filters)

  return { items, total: items.length, fetchedAt, sources, facets }
}
