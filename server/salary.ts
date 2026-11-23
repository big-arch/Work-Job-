import { emptySalary, type Salary } from '../src/types'

export function payPeriod(unit?: string): Salary['period'] {
  const value = unit?.trim().toUpperCase().replace(/^1\s+/, '')
  if (value === 'YEAR' || value === 'ANNUAL') return 'year'
  if (value === 'MONTH' || value === 'MONTHLY') return 'month'
  if (value === 'HOUR' || value === 'HOURLY') return 'hour'
  return 'not_specified'
}

export function numericSalary(low: unknown, high: unknown, code?: string, unit?: string): Salary {
  const amount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
  const min = amount(low), max = amount(high)
  if ((!min && !max) || (min && max && min > max)) return { ...emptySalary }
  const raw = code?.trim().toUpperCase() ?? ''
  const currency = /^(?:RUR|₽|«?РУБ\.?»?)$/.test(raw) ? 'RUB' : /^[A-Z]{3}$/.test(raw) ? raw : null
  const period = payPeriod(unit)
  const display = (n: number) => n.toLocaleString('ru-RU')
  const bounds = min && max ? min === max ? display(min) : display(min) + ' – ' + display(max)
    : min ? 'от ' + display(min) : 'до ' + display(max!)
  const suffix = { month: '/мес.', year: '/год', hour: '/ч', not_specified: '' }[period]
  const text = [bounds, currency === 'RUB' ? '₽' : currency].filter(Boolean).join(' ') + suffix
  return { ...emptySalary, min, max, currency, period, text }
}
