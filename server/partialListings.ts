import type { Vacancy } from '../src/types'

// An incomplete source can contribute only the records that passed its current checks.
export class PartialListings extends Error {
  readonly jobs: Vacancy[]
  constructor(jobs: Vacancy[]) {
    super('Часть страниц недоступна. Учтены только полученные объявления.')
    this.jobs = jobs
  }
}
