import { useMemo, useState } from 'react'
import type { SearchFilters, Vacancy } from '../types'
import { useVacancies } from '../hooks/useVacancies'
import { ErrorState } from '../components/States'
import { sourceCoverage } from '../lib/catalogResponse'
import { SalaryView } from './SalaryView'

export function SalaryMarketPage({filters,closedIds,onOpen}:{filters:SearchFilters;closedIds:Set<string>;onOpen:(job:Vacancy)=>void}) {
  const [revision,setRevision] = useState(0)
  const { data, loading, error } = useVacancies(filters,revision)
  const items = useMemo(()=>data?.items.filter(job=>!closedIds.has(job.id)) ?? [],[data,closedIds])
  if (error && !data) return <ErrorState message={error} onRetry={()=>setRevision(Date.now())}/>
  const coverage = sourceCoverage(data?.sources ?? [], filters.source)
  if (!loading && !items.length && (coverage.status==='stale' || coverage.status==='unavailable')) return <ErrorState message={coverage.status==='stale' ? 'Срок проверки зарплатных данных истёк.' : 'Источники не подтвердили данные для расчёта зарплат.'} onRetry={()=>setRevision(Date.now())}/>
  return <SalaryView items={items} loading={loading} checked={data?.fetchedAt} onOpen={onOpen}/>
}
