import { useEffect, useState } from 'react'
import { z } from 'zod'
import type { Vacancy } from '../types'

const STORAGE_KEY = 'atlas-career-saved-v1'
const httpUrl = z.string().url().refine((value) => value.startsWith('https://') || value.startsWith('http://'))

const vacancySchema = z.object({
  id: z.string(),
  externalId: z.string(),
  source: z.enum(['hh', 'remotive', 'remoteok', 'arbeitnow', 'jobicy', 'wwr', 'greenhouse', 'ashby', 'lever', 'telegram', 'egis', 'sixt', 'endava', 'aecom', 'ramboll', 'trudvsem', 'habr', 'superjob']),
  sourceName: z.string(),
  sourceUrl: httpUrl,
  title: z.string(),
  company: z.string(),
  companyLogo: z.string().nullable(),
  description: z.string(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  countryCode: z.string().nullable(),
  workFormat: z.enum(['remote', 'hybrid', 'office', 'unspecified']),
  domain: z.enum(['it', 'bim', 'design', 'other']),
  salary: z.object({
    text: z.string().nullable(),
    min: z.number().nullable(),
    max: z.number().nullable(),
    currency: z.string().nullable(),
    period: z.enum(['hour', 'month', 'year', 'not_specified']),
    taxBasis: z.enum(['gross', 'net', 'not_specified']),
  }),
  publishedAt: z.string().nullable(),
  verifiedAt: z.string(),
  url: httpUrl,
  applyUrl: httpUrl,
  tags: z.array(z.string()),
  isDemo: z.boolean(),
  matchedQuery: z.string().optional(),
  employment: z.string().optional(), experience: z.string().optional(), industry: z.string().optional(),
  department: z.string().optional(), address: z.string().optional(),
  detailPending: z.boolean().optional(),
  isTelegram: z.boolean(),
})

export { vacancySchema }

function loadSaved(): Vacancy[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      const result = vacancySchema.safeParse(item)
      return result.success ? [result.data] : []
    })
  } catch {
    return []
  }
}

export function useSaved() {
  const [saved, setSaved] = useState<Vacancy[]>(loadSaved)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    } catch {
      return
    }
  }, [saved])

  const toggleSaved = (vacancy: Vacancy) => {
    setSaved((current) => current.some((item) => item.id === vacancy.id)
      ? current.filter((item) => item.id !== vacancy.id)
      : [vacancy, ...current])
  }

  const removeSaved = (id: string) => {
    setSaved((current) => current.filter((item) => item.id !== id))
  }

  return { saved, toggleSaved, removeSaved }
}
