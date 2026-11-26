import { ArrowLeft, ArrowRight } from 'lucide-react'

export interface PagerProps { index: number; count: number; onMove: (index: number) => void }
export function VacancyPager({index, count, onMove}: PagerProps) {
  if (count < 2 || index < 0) return null
  return <nav className="vacancy-pager" aria-label="Перелистывание вакансий">
    <button type="button" aria-label="Предыдущая вакансия" disabled={index===0} onClick={()=>onMove(index-1)}><ArrowLeft size={17}/></button>
    <span aria-live="polite">Вакансия <b>{(index+1).toLocaleString('ru-RU')}</b> из {count.toLocaleString('ru-RU')}</span>
    <button type="button" aria-label="Следующая вакансия" disabled={index===count-1} onClick={()=>onMove(index+1)}><ArrowRight size={17}/></button>
  </nav>
}
