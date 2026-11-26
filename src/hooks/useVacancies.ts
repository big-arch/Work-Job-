import { useEffect, useMemo, useState } from 'react'
import { publishedMode } from '../lib/siteMode'
import { projectCatalog } from '../lib/catalogResponse'
import { feedLifetime } from '../lib/freshness'
import type { SearchFilters, Vacancy, VacancyResponse } from '../types'

interface Result { key: string; data: VacancyResponse | null; error: string | null; loading: boolean }

// Only a search term or source can change an upstream request. Other controls act on the loaded rows.
export function useVacancies(filters: SearchFilters, reloadToken: number) {
  const { q, source } = filters
  const upstream = useMemo<SearchFilters>(() => ({ q, source, domain: 'all', workFormat: 'all', country: 'all', sort: 'relevance' }), [q, source])
  const [state, setState] = useState<Result | null>(null)
  const [catalog, setCatalog] = useState<VacancyResponse | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [clock, setClock] = useState(() => Date.now())
  const key = JSON.stringify([q, source, reloadToken, refresh])
  const raw = state?.key === key && state.data ? state.data : catalog
  const nextExpiry = useMemo(() => {
    let next = Infinity
    for (const job of raw?.items ?? []) {
      for (const end of deadlines(job)) if (end > clock && end < next) next = end
    }
    return next
  }, [raw, clock])

  useEffect(() => {
    if (!Number.isFinite(nextExpiry)) return
    const timer = window.setTimeout(() => setClock(Date.now()), Math.max(1, nextExpiry - Date.now() + 1))
    return () => window.clearTimeout(timer)
  }, [nextExpiry])

  useEffect(() => {
    let last = Date.now()
    const check = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - last >= 5 * 60_000) { last = Date.now(); setClock(last); setRefresh(n => n + 1) }
    }
    const timer = window.setInterval(check, 60_000)
    document.addEventListener('visibilitychange', check)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', check) }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams(Object.entries(upstream))
    let finished = false
    let timer: number | undefined
    async function load(phase: 'cache' | 'live') {
      if (publishedMode) {
        const { publishedSearch } = await import('../lib/publishedCatalog')
        return publishedSearch(upstream, phase, reloadToken)
      }
      const response = await fetch('/api/vacancies?' + params + '&phase=' + phase, { signal: controller.signal, cache: 'no-store' })
      if (!response.ok) throw Error('Ошибка сервера ' + response.status)
      return await response.json() as VacancyResponse
    }
    function display(data: VacancyResponse, loading: boolean) {
      setClock(Date.now())
      if (!upstream.q && upstream.source === 'all') setCatalog(data)
      setState({ key, data, loading, error: null })
    }
    async function cached() {
      if (finished || controller.signal.aborted) return
      try {
        const data = await load('cache')
        if (!finished && !controller.signal.aborted && data.items.length) display(data, true)
      } catch { /* The live request supplies the final status. */ }
      if (!publishedMode && !finished && !controller.signal.aborted) timer = window.setTimeout(() => void cached(), 3500)
    }
    void cached()
    load('live').then(data => {
      finished = true
      if (!controller.signal.aborted) display(data, false)
    }).catch(reason => {
      finished = true
      if (!controller.signal.aborted) setState(previous => ({ key, data: previous?.key === key ? previous.data : null,
        loading: false, error: reason instanceof Error ? reason.message : 'Не удалось загрузить вакансии' }))
    }).finally(() => { finished = true; window.clearTimeout(timer) })
    return () => { finished = true; window.clearTimeout(timer); controller.abort() }
  }, [upstream, key, reloadToken])

  const data = useMemo(() => raw ? projectCatalog(raw.items, filters, raw.sources, clock) : null, [raw, filters, clock])
  return { data, loading: state?.key !== key || state.loading, error: state?.key === key ? state.error : null }
}

function deadlines(job: Vacancy) {
  const values = [Date.parse(job.verifiedAt) + feedLifetime]
  if (job.validThrough) values.push(Date.parse(job.validThrough.length === 10 ? job.validThrough + 'T23:59:59Z' : job.validThrough))
  if (job.isTelegram && job.publishedAt) values.push(Date.parse(job.publishedAt) + 30 * 86400_000)
  return values
}
