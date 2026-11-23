import { AlertCircle, BriefcaseBusiness, RefreshCw, SearchX } from 'lucide-react'

export function VacancySkeleton() {
  return <div className="skeleton-list" aria-label="Загрузка вакансий">{Array.from({ length: 5 }, (_, index) => <div className="skeleton-card" key={index}><i /><span /><span /><span /></div>)}</div>
}

export function EmptyState({ onReset }: { onReset: () => void }) {
  return <div className="empty-state"><SearchX size={38} /><h2>Точных совпадений нет</h2><p>Попробуйте убрать часть фильтров или изменить запрос.</p><button className="secondary-button" type="button" onClick={onReset}>Сбросить фильтры</button></div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="empty-state error-state"><AlertCircle size={38} /><h2>Не удалось обновить выдачу</h2><p>{message}</p><button className="secondary-button" type="button" onClick={onRetry}><RefreshCw size={16} />Попробовать снова</button></div>
}

export function DetailPlaceholder() {
  return <div className="detail-placeholder"><BriefcaseBusiness size={40} /><h2>Выберите вакансию</h2><p>Здесь появятся условия, описание, дата проверки и ссылка на отклик.</p></div>
}
