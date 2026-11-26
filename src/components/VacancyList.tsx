import { ArrowDown, Bookmark, BriefcaseBusiness, Building2, ChevronRight, Clock3, MapPin, Monitor, Send, Wallet } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import type { Vacancy } from '../types'
import { listedSkills } from '../lib/jobProfile'
import { companyInitials, conditionLabel, domainLabels, formatDate, workFormatLabels } from '../lib/utils'

interface VacancyListProps {
  items: Vacancy[]
  selectedId: string | null
  savedIds: Set<string>
  visibleCount: number
  onSelect: (vacancy: Vacancy) => void
  onToggleSaved: (vacancy: Vacancy) => void
  onShowMore: () => void
}

function moveFocus(event: KeyboardEvent<HTMLButtonElement>) {
  if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return
  const buttons = Array.from(event.currentTarget.closest('ul')?.querySelectorAll<HTMLButtonElement>('.vacancy-card-main') ?? [])
  const index = buttons.indexOf(event.currentTarget)
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : index + (event.key === 'ArrowDown' ? 1 : -1)
  event.preventDefault()
  buttons[Math.max(0, Math.min(next, buttons.length - 1))]?.focus()
}

export function VacancyList({ items, selectedId, savedIds, visibleCount, onSelect, onToggleSaved, onShowMore }: VacancyListProps) {
  return <div className="vacancy-list-wrap">
    <ul className="vacancy-list" aria-label="Вакансии">
      {items.slice(0, visibleCount).map(job => {
        const saved = savedIds.has(job.id)
        const selected = selectedId === job.id
        const place = [...new Set([job.city, job.country].filter(Boolean))].join(', ')
        const skills = listedSkills(job).slice(0,3)
        return <li key={job.id} className={'vacancy-card glance-card' + (selected ? ' selected' : '')}>
          <div className="glance-eyebrow"><span className={'discipline-mark kind-' + job.domain}/>{domainLabels[job.domain]}</div>
          <h2><button className="vacancy-card-main" type="button" onClick={()=>onSelect(job)} onKeyDown={moveFocus}
            aria-keyshortcuts="ArrowUp ArrowDown Home End" aria-pressed={selected} aria-label={'Открыть вакансию '+job.title}>{job.title}</button></h2>
          <div className="glance-company"><span className="company-logo" aria-hidden="true">{/не указан/i.test(job.company) ? <Building2 size={14}/> : companyInitials(job.company)}</span><strong>{job.company}</strong></div>
          <div className={'glance-pay' + (job.salary.text ? '' : ' unspecified')}><Wallet size={16} aria-hidden="true"/>{job.salary.text || 'Зарплата не указана'}</div>
          <div className="glance-conditions"><span><MapPin/>{place || 'Место не указано'}</span><span><Monitor/>{workFormatLabels[job.workFormat]}</span>
            {(job.experience || job.employment) && <span><BriefcaseBusiness/>{conditionLabel(job.experience || job.employment)}</span>}
          </div>
          {skills.length > 0 && <div className="glance-skills" aria-label="Навыки из объявления">{skills.map(name=><span key={name}>{name}</span>)}</div>}
          <div className="glance-origin"><span>{job.isTelegram ? <Send/> : <Clock3/>}{job.isTelegram ? 'Telegram · набор уточняется' : job.sourceName === job.company ? 'Сайт работодателя' : job.sourceName}</span>
            <span>{job.publishedAt ? 'Опубл. '+formatDate(job.publishedAt) : 'Сверено '+formatDate(job.verifiedAt,true)}<ChevronRight className="glance-chevron"/></span></div>
          <button className={'save-button'+(saved ? ' saved' : '')} type="button" onClick={()=>onToggleSaved(job)} aria-pressed={saved}
            aria-label={(saved ? 'Удалить из сохранённого: ' : 'Сохранить: ')+job.title}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'}/></button>
        </li>
      })}
    </ul>
    {visibleCount < items.length && <button className="show-more" type="button" onClick={onShowMore}><ArrowDown size={16}/> Показать ещё <span>{visibleCount} из {items.length}</span></button>}
  </div>
}
