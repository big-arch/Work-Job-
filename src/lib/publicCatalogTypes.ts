import type { SourceHealth, Vacancy } from '../types'

export interface PublicCatalog {
  version: 1
  fetchedAt: string
  items: Vacancy[]
  matches: Record<string,string[]>
  sources: SourceHealth[]
}
