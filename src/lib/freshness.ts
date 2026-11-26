import type { Vacancy } from '../types'

export const feedLifetime = 6 * 60 * 60_000

export function recentCheck(stamp: string, now = Date.now()) {
  const age = now - Date.parse(stamp)
  return Number.isFinite(age) && age < feedLifetime && age >= -5 * 60_000
}

export function withinDeadline(deadline?: string, now = Date.now()) {
  if (!deadline) return true
  // Date-only deadlines include the published day.
  const end = Date.parse(deadline.length === 10 ? deadline + 'T23:59:59Z' : deadline)
  return Number.isFinite(end) && end > now
}

export function currentListing(job: Vacancy, now = Date.now()) {
  return !job.isDemo && !/\b(?:general application|open application|spontaneous application|talent (?:pool|community)|expression of interest)\b|кадровый резерв/i.test(job.title) && recentCheck(job.verifiedAt, now) && withinDeadline(job.validThrough, now)
    && (!job.isTelegram || (!!job.publishedAt && Date.parse(job.publishedAt) >= now - 30 * 86400_000))
}
