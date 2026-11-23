import { RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import type { CountryFacet, SearchFilters, SourceHealth } from '../types'

interface FiltersPanelProps {
  filters: SearchFilters
  sources: SourceHealth[]
  countries: CountryFacet[]
  onChange: (filters: SearchFilters) => void
  onReset: () => void
}

export function FiltersPanel({ filters, sources, countries, onChange, onReset }: FiltersPanelProps) {
  const instanceId = useId()
  const countryId = `${instanceId}-country`
  const sourceId = `${instanceId}-source`
  const sortId = `${instanceId}-sort`
  const radioName = `${instanceId}-work-format`

  return (
    <div className="filters-content">
      <div className="filters-title"><span><SlidersHorizontal size={17} aria-hidden="true" />Фильтры</span><button type="button" onClick={onReset}><RotateCcw size={14} aria-hidden="true" />Сбросить</button></div>
      <fieldset className="filter-group">
        <legend>Формат работы</legend>
        {[
          ['all', 'Любой'], ['remote', 'Удалённо'], ['hybrid', 'Гибрид'], ['office', 'Офис'], ['unspecified', 'Не указан'],
        ].map(([value, label]) => (
          <label className="radio-row" key={value}>
            <input type="radio" name={radioName} value={value} checked={filters.workFormat === value} onChange={() => onChange({ ...filters, workFormat: value as SearchFilters['workFormat'] })} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <div className="filter-group">
        <label htmlFor={countryId}>Страна или регион</label>
        <div className={'select-wrap' + (filters.country !== 'all' ? ' country-chosen' : '')}><select id={countryId} value={filters.country} onChange={(event) => onChange({ ...filters, country: event.target.value })}>
          <option value="all">Все страны</option>
          <option value="WW">Удалённо / мир</option>
          {countries.filter(country => country.code !== 'WW').map((country) => <option key={country.code} value={country.code}>{country.name} · {country.count}</option>)}
        </select></div>
      </div>
      <div className="filter-group">
        <label htmlFor={sourceId}>Источник</label>
        <div className="select-wrap"><select id={sourceId} value={filters.source} onChange={(event) => onChange({ ...filters, source: event.target.value as SearchFilters['source'] })}>
          <option value="all">Все доступные</option>
          <option value="telegram">Все Telegram-источники</option>
          {sources.filter((source) => source.kind !== 'restricted').map((source) => <option key={source.id} value={source.id}>{source.name}{source.status === 'unavailable' ? ' · недоступен' : ''}</option>)}
        </select></div>
      </div>
      <div className="filter-group">
        <label htmlFor={sortId}>Сначала</label>
        <div className="select-wrap"><select id={sortId} value={filters.sort} onChange={(event) => onChange({ ...filters, sort: event.target.value as SearchFilters['sort'] })}>
          <option value="relevance">Самые подходящие</option>
          <option value="recent">Самые свежие</option>
        </select></div>
      </div>
      <div className="filter-note"><i /><p>Для визы, переезда и зарплаты учитываем условия конкретной вакансии.</p></div>
    </div>
  )
}

interface FiltersDrawerProps extends FiltersPanelProps {
  open: boolean
  onClose: () => void
}

export function FiltersDrawer({ open, onClose, ...props }: FiltersDrawerProps) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={ref} className="filters-drawer" aria-labelledby="filters-drawer-title" onClose={onClose}>
      <div className="drawer-top"><h2 id="filters-drawer-title">Настроить выдачу</h2><form method="dialog"><button className="icon-button" aria-label="Закрыть фильтры"><X size={19} /></button></form></div>
      <FiltersPanel {...props} />
      <button className="primary-button drawer-apply" type="button" onClick={onClose}>Показать вакансии</button>
    </dialog>
  )
}
