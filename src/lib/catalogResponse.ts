import { domains, type SearchFilters, type SourceHealth, type Vacancy, type VacancyResponse } from '../types'
import { currentListing, recentCheck } from './freshness'
import { listedSkills, creativeTools } from './jobProfile'
import { creativeQuery, matchesDomain } from './creativeRoles'
import { dedupeVacancies, filterAndSort } from '../../server/normalize'

export function sourceCoverage(sources: SourceHealth[], source: SearchFilters['source'], feed = 'all') {
  const relevant = sources.filter(s => (source === 'all' ? s.kind !== 'restricted' :
    s.id === source || source === 'telegram' && s.kind === 'telegram')
    && (feed === 'all' || (feed === 'telegram') === (s.kind === 'telegram')))
  const checked = relevant.filter(s => s.fetchedAt && recentCheck(s.fetchedAt) && (s.status === 'online' || s.status === 'degraded'))
  const lastCheck = relevant.reduce<string | null>((last, s) =>
    s.fetchedAt && Number.isFinite(Date.parse(s.fetchedAt)) && (!last || Date.parse(s.fetchedAt) > Date.parse(last)) ? s.fetchedAt : last, null)
  const status = checked.length ? (checked.length === relevant.length && checked.every(s => s.status === 'online') ? 'ready' : 'partial') :
    lastCheck && !recentCheck(lastCheck) ? 'stale' : 'unavailable'
  return { status, lastCheck, checked: checked.length, total: relevant.length }
}

export function projectCatalog(jobs: Vacancy[], filters: SearchFilters, sources: SourceHealth[], now = Date.now()): VacancyResponse {
  const current = jobs.filter(job => currentListing(job, now))
  const matching = filterAndSort(current, { ...filters, domain: 'all', workFormat: 'all', country: 'all' })
  const {domain, skill} = filters
  const inDomain = domain === 'all' ? matching : matching.filter(job => matchesDomain(job, domain))
  const countries = new Map<string, { code: string; name: string; count: number }>()
  for (const job of inDomain) {
    if (!job.countryCode || !job.country) continue
    const entry = countries.get(job.countryCode)
    if (entry) entry.count++
    else countries.set(job.countryCode, { code: job.countryCode, name: job.country, count: 1 })
  }
  const local = (job: Vacancy) => (filters.workFormat === 'all' || filters.workFormat === job.workFormat)
    && (!filters.country || filters.country === 'all' || (job.countryCode ?? job.country) === filters.country)
  const candidates = inDomain.filter(local)
  const items = skill ? candidates.filter(job => listedSkills(job).includes(skill)) : candidates
  const skills: { name: string; count: number }[] = []
  if (filters.skill || filters.domain === '3d' || filters.domain === 'animation' || creativeQuery(filters.q).length) {
    const totals = new Map<string, number>()
    for (const job of candidates) for (const name of listedSkills(job)) totals.set(name, (totals.get(name) ?? 0) + 1)
    for (const name of creativeTools) if (totals.has(name)) skills.push({name, count: totals.get(name)!})
    skills.sort((a,b) => b.count - a.count || a.name.localeCompare(b.name))
  }
  const scope = matching.filter(local)
  return { items, total: items.length, fetchedAt: sourceCoverage(sources, filters.source).lastCheck, sources,
    facets: { skills, countries: [...countries.values()].sort((a,b) => b.count - a.count),
      domains: domains.map(id => ({ id, count: scope.reduce((n, job) => n + Number(matchesDomain(job,id)), 0) })) } }
}

export function catalogResponse(jobs: Vacancy[], filters: SearchFilters, sources: SourceHealth[]): VacancyResponse {
  return projectCatalog(dedupeVacancies(jobs.filter(job => currentListing(job))), filters, sources)
}
