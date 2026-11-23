import { Bookmark, ChevronRight, Clock3, MapPin, Send } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { CSSProperties } from 'react'
import type { Vacancy } from '../types'
import { companyInitials, conditionLabel, domainLabels, formatDate, vacancyTransitionId, workFormatLabels } from '../lib/utils'

interface VacancyListProps {
  items: Vacancy[]
  selectedId: string | null
  cachedSources?: Set<string>
  savedIds: Set<string>
  visibleCount: number
  onSelect: (vacancy: Vacancy) => void
  onToggleSaved: (vacancy: Vacancy) => void
  onShowMore: () => void
}

export function VacancyList({ items, selectedId, cachedSources, savedIds, visibleCount, onSelect, onToggleSaved, onShowMore }: VacancyListProps) {
  return (
    <div className="vacancy-list-wrap">
      <ul className="vacancy-list" aria-label="Вакансии">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.slice(0, visibleCount).map((vacancy, index) => {
            const saved = savedIds.has(vacancy.id)
            const selected = selectedId === vacancy.id
            return (
              <motion.li
                layout
                key={vacancy.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.22, layout: { duration: 0.28 } }}
                className={`vacancy-card ${selected ? 'selected' : ''}`}
                style={{ '--sibling-index': index + 1, viewTransitionName: vacancyTransitionId(vacancy.id), viewTransitionClass: 'vacancy-card' } as CSSProperties}
              >
                <button className={`save-button ${saved ? 'saved' : ''}`} type="button" onClick={() => onToggleSaved(vacancy)} aria-label={saved ? `Удалить из сохранённого: ${vacancy.title}` : `Сохранить: ${vacancy.title}`} aria-pressed={saved}>
                  <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} aria-hidden="true" />
                </button>
                <button className="vacancy-card-main" type="button" onClick={() => onSelect(vacancy)} aria-label={`Открыть вакансию ${vacancy.title}`} aria-pressed={selected}>
                  <div className="vacancy-card-top">
                    <span className="company-logo">{vacancy.companyLogo ? <img src={vacancy.companyLogo} alt="" loading="lazy" /> : companyInitials(vacancy.company)}</span>
                    <span className="company-meta"><b>{vacancy.company}</b><small>{vacancy.company===vacancy.sourceName?'Сайт работодателя':vacancy.sourceName}</small></span>
                    <ChevronRight className="card-chevron" size={18} aria-hidden="true" />
                  </div>
                  <h2>{vacancy.title}</h2>
                  {(vacancy.department||vacancy.industry||vacancy.experience) && <div className="list-specialty">{[conditionLabel(vacancy.department||vacancy.industry),conditionLabel(vacancy.experience)].filter(Boolean).join(' · ')}</div>}
                  {!vacancy.detailPending && vacancy.description && <p className="list-excerpt">{vacancy.description.split('\n').map(s=>s.trim()).find(s=>s.length>45 && !s.startsWith('#') && !s.toLowerCase().startsWith(vacancy.title.toLowerCase())) || vacancy.description}</p>}
                  <div className="vacancy-tags"><span className={`domain-tag ${vacancy.domain}`}>{domainLabels[vacancy.domain]}</span>{cachedSources?.has(vacancy.source) && <span className="cache-tag">Снимок · {formatDate(vacancy.verifiedAt)}</span>}{vacancy.isDemo && <span className="demo-tag">ДЕМО</span>}{vacancy.isTelegram && <span className="telegram-tag"><Send size={11} />Набор уточняется</span>}</div>
                  <div className="vacancy-facts"><span><MapPin size={14} aria-hidden="true" />{vacancy.city ?? vacancy.country ?? 'Локация не указана'}</span><span><Clock3 size={14} aria-hidden="true" />{formatDate(vacancy.publishedAt)}</span></div>
                  <div className="vacancy-card-bottom"><span>{[vacancy.workFormat==='unspecified'?'':workFormatLabels[vacancy.workFormat], conditionLabel(vacancy.employment)].filter(Boolean).join(' · ')}</span>{vacancy.salary.text && <strong>{vacancy.salary.text}</strong>}</div>
                </button>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
      {visibleCount < items.length && <button className="show-more" type="button" onClick={onShowMore}>Показать ещё <span>{visibleCount} из {items.length}</span></button>}
    </div>
  )
}
