import type { SearchFilters, SourceHealth, VacancyResponse } from '../src/types'
import { recentCheck, currentListing } from '../src/lib/freshness'
import { CACHE_PREFIX, loadCache, saveCache } from './cache'
import { catalogResponse } from '../src/lib/catalogResponse'
import { errorMessage, normalizeSearch } from './normalize'
import type { ProviderDefinition } from './registry'
import type { Vacancy } from '../src/types'
import { mapLimit } from './mapLimit'
import { PartialListings } from './partialListings'
import { providers, restrictedSources } from './registry'


const cache = loadCache()
const latestHealth = new Map<string, SourceHealth>()


type Batch = { jobs: Vacancy[]; health: SourceHealth }
const pending = new Map<string, Promise<Batch>>()
const failures = new Map<string, { at: number; result: Batch }>()
const closedJobs = new Map<string, number>()
export function markClosed(id: string) {
  closedJobs.set(id, Date.now())
}

function providerBatch(provider: ProviderDefinition, filters: SearchFilters, cacheOnly: boolean): Promise<Batch> {
  const remoteQuery = provider.queryAware || provider.id === 'hh' || provider.id === 'remotive'
  const key = CACHE_PREFIX + provider.id + ':' + (remoteQuery ? normalizeSearch(filters.q) : '')
  const cached = cache.get(key)
  const fresh = cached && Date.now() - Date.parse(cached.fetchedAt) < provider.cacheTtlMs
  const batch = (jobs: Vacancy[], status: SourceHealth['status'], fetchedAt: string | null, error: string | null): Batch => ({
    jobs, health: { id: provider.id, name: provider.name, kind: provider.kind, homeUrl: provider.homeUrl, note: provider.note, count: jobs.length, status, fetchedAt, error },
  })
  const recentFailure = failures.get(key)
  if (recentFailure && Date.now() - recentFailure.at < 60_000) return Promise.resolve(recentFailure.result)
  if (fresh) return Promise.resolve(batch(cached.jobs, cached.partial ? 'degraded' : 'online', cached.fetchedAt, cached.partial ? 'Часть страниц источника недоступна.' : null))
  if (cacheOnly) return Promise.resolve(cached && recentCheck(cached.fetchedAt)
    ? batch(cached.jobs.filter(job=>currentListing(job)), 'degraded', cached.fetchedAt, 'Обновляем ленту.')
    : batch([], 'disabled', cached?.fetchedAt ?? null, null))
  const ongoing = pending.get(key)
  if (ongoing) return ongoing
  const result = provider.fetch(filters).then(jobs => {
    const fetchedAt = new Date().toISOString()
    cache.delete(key)
    cache.set(key, { jobs, fetchedAt })
    saveCache(cache)
    failures.delete(key)
    return batch(jobs, 'online', fetchedAt, null)
  }).catch(error => {
    const partial = error instanceof PartialListings && error.jobs.length > 0
    const fallback = cached && recentCheck(cached.fetchedAt) ? cached.jobs.filter(job=>currentListing(job)) : []
    const result = batch(partial ? error.jobs : fallback, partial || fallback.length ? 'degraded' : 'unavailable',
      partial ? new Date().toISOString() : cached?.fetchedAt ?? null, errorMessage(error))
    if (partial) {
      cache.set(key,{jobs:result.jobs,fetchedAt:result.health.fetchedAt!,partial:true})
      saveCache(cache)
    }
    failures.set(key, { result, at: Date.now() })
    return result
  }).finally(() => pending.delete(key))
  pending.set(key, result)
  return result
}

export async function aggregate(filters: SearchFilters, cacheOnly = false): Promise<VacancyResponse> {
  const activeProviders = providers.filter(provider => filters.source === 'all' || provider.id === filters.source || (filters.source === 'telegram' && provider.kind === 'telegram'))
  const results = await mapLimit(activeProviders, 10, provider => providerBatch(provider, filters, cacheOnly))
  if (!cacheOnly) for (const result of results) latestHealth.set(result.health.id, result.health)

  const skippedProviders = providers.filter(provider => !activeProviders.includes(provider))
  const skippedHealth: SourceHealth[] = skippedProviders.map((provider) => latestHealth.get(provider.id) ?? {
    id: provider.id, name: provider.name, kind: provider.kind, homeUrl: provider.homeUrl,
    status: 'disabled', count: 0, error: null, fetchedAt: null, note: 'Не участвует в текущем фильтре источников.',
  })
  const sources = [...results.map((result) => result.health), ...skippedHealth, ...restrictedSources]
  for (const [id, at] of closedJobs) if (Date.now() - at > 24 * 60 * 60_000) closedJobs.delete(id)
  const jobs = results.flatMap(result=>result.jobs).filter(job=>!closedJobs.has(job.id))
  return catalogResponse(jobs, filters, sources)
}

export function sourceRegistry() {
  return [...providers.map((provider): SourceHealth => latestHealth.get(provider.id) ?? {
    id: provider.id, name: provider.name, kind: provider.kind, homeUrl: provider.homeUrl,
    status: 'disabled', count: 0, error: null, fetchedAt: null, note: provider.note,
  }), ...restrictedSources]
}
