import { useEffect, useState } from 'react'
import { publishedMode } from '../lib/siteMode'
import type { SearchFilters, VacancyResponse } from '../types'

export function useVacancies(filters: SearchFilters, reloadToken: number) {
  const [state, setState] = useState<{ key: string; data: VacancyResponse | null; error: string | null; loading: boolean } | null>(null)
  const [refresh,setRefresh] = useState(0)
  useEffect(()=>{
    let last=Date.now()
    const check=()=>{
      if(document.visibilityState==='visible' && Date.now()-last>=5*60_000){last=Date.now();setRefresh(n=>n+1)}
    }
    const timer=window.setInterval(check,60_000)
    document.addEventListener('visibilitychange',check)
    return ()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',check)}
  },[])
  const key = JSON.stringify([filters, reloadToken, refresh])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
    let finished = false
    let timer: number | undefined
    const loadPhase = async (phase: 'cache' | 'live') => {
      if (publishedMode) {
        const { publishedSearch } = await import('../lib/publishedCatalog')
        return publishedSearch(filters, phase, reloadToken)
      }
      const response = await fetch('/api/vacancies?' + params + '&phase=' + phase, { signal: controller.signal, cache: 'no-store' })
      if (!response.ok) throw Error('Ошибка сервера ' + response.status)
      return await response.json() as VacancyResponse
    }
    const showProgress = async () => {
      if (finished || controller.signal.aborted) return
      try {
        const snapshot = await loadPhase('cache')
        if (!finished && !controller.signal.aborted && snapshot.items.length) setState({ key, data: snapshot, loading: true, error: null })
      } catch { /* The live request reports the final status. */ }
      if (!publishedMode && !finished && !controller.signal.aborted) timer = window.setTimeout(() => void showProgress(), 3500)
    }
    void showProgress()
    loadPhase('live').then(result => {
      if (!controller.signal.aborted) setState({ key, data: result, loading: false, error: null })
    }).catch(reason => {
      if (!controller.signal.aborted) setState(current => ({
        key, data: current?.key === key ? current.data : null, loading: false,
        error: reason instanceof Error ? reason.message : 'Не удалось загрузить вакансии',
      }))
    }).finally(() => {
      finished = true
      window.clearTimeout(timer)
    })
    return () => {
      finished = true
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [filters, key, reloadToken])

  return state?.key === key ? state : { data: null, loading: true, error: null }
}
