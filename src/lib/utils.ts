import type { Domain, WorkFormat } from '../types'

export const domainLabels: Record<Domain, string> = {
  it: 'IT и разработка',
  bim: 'BIM и проектирование',
  design: 'Дизайн',
  other: 'Другое',
}

export const workFormatLabels: Record<WorkFormat, string> = {
  remote: 'Удалённо',
  hybrid: 'Гибрид',
  office: 'Офис',
  unspecified: 'Формат не указан',
}

export function formatDate(value: string | null, withTime = false) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Не указано'
  return new Intl.DateTimeFormat('ru-RU', withTime
    ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value))
}

export function companyInitials(company: string) {
  return company.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'A'
}

export function vacancyTransitionId(id: string) {
  return `vacancy-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

export function runViewTransition(update: () => void) {
  if (document.startViewTransition) {
    document.startViewTransition(update)
  } else {
    update()
  }
}

const knownConditionLabels: Record<string,string> = {
  'full-time':'Полная занятость','full time':'Полная занятость','part-time':'Частичная занятость','part time':'Частичная занятость',
  'contract':'По контракту','internship':'Стажировка','early careers':'Начало карьеры','entry level':'Начальный уровень',
  'mid-senior level':'Средний и старший уровень','associate':'Специалист','executive':'Руководитель',
  'civil engineering':'Гражданское строительство','engineering':'Инженерия','transport':'Транспорт',
  'design':'Проектирование','construction':'Строительство','information technology':'Информационные технологии',
}
export function conditionLabel(value?:string|null) {
  return value ? knownConditionLabels[value.trim().toLowerCase()] || value : ''
}
