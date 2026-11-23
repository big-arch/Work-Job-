import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { Vacancy } from '../src/types'

interface CacheEntry {
  partial?: boolean
  jobs: Vacancy[]
  fetchedAt: string
}

export const CACHE_PREFIX = 'workjob-fresh-v2:'
const cachePath = resolve('data/provider-cache.json')

export function loadCache() {
  try {
    if (!existsSync(cachePath)) return new Map<string, CacheEntry>()
    const parsed = JSON.parse(readFileSync(cachePath, 'utf8')) as Record<string, CacheEntry>
    return new Map(Object.entries(parsed).filter(([key, entry]) => key.startsWith(CACHE_PREFIX) && Array.isArray(entry.jobs) && Date.now() - Date.parse(entry.fetchedAt) < 24 * 60 * 60_000))
  } catch {
    return new Map<string, CacheEntry>()
  }
}

export function saveCache(cache: Map<string, CacheEntry>) {
  try {
    while (cache.size > 100) {
      const oldest = cache.keys().next().value
      if (!oldest) break
      cache.delete(oldest)
    }
    mkdirSync(dirname(cachePath), { recursive: true })
    const temporaryPath = `${cachePath}.tmp`
    writeFileSync(temporaryPath, JSON.stringify(Object.fromEntries(cache)), 'utf8')
    renameSync(temporaryPath, cachePath)
  } catch {
    return
  }
}
