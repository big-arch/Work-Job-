import type { Salary, Vacancy } from '../types'

export type Measure = 'min' | 'mid' | 'max'
export interface Observation { job: Vacancy; amount: number }
export const periodNames = { month:'в месяц',year:'в год',hour:'в час',not_specified:'период не указан' } as const
export const taxNames = { gross:'до налогов',net:'на руки',not_specified:'налоги не уточнены' } as const
export const measureNames = {min:'Нижняя граница',mid:'Середина вилки',max:'Верхняя граница'} as const

function positive(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}
export function salaryKey(s: Salary) {
  if (!s.currency || !/^[A-Z]{3}$/.test(s.currency) || s.period === 'not_specified') return ''
  if (!positive(s.min) && !positive(s.max)) return ''
  if (positive(s.min) && positive(s.max) && s.max < s.min) return ''
  return [s.currency,s.period,s.taxBasis].join('|')
}
export function quotedValue(s: Salary, measure: Measure) {
  if (measure === 'mid') return positive(s.min) && positive(s.max) ? (s.min + s.max) / 2 : null
  return positive(s[measure]) ? s[measure] : null
}
export function quantile(sorted: number[], p: number) {
  if (!sorted.length) return null
  const pos = p * (sorted.length - 1), left = Math.floor(pos)
  return sorted[left] + (sorted[Math.ceil(pos)] - sorted[left]) * (pos - left)
}
export function distribution(rows: Observation[]) {
  const values = rows.map(r=>r.amount).sort((a,b)=>a-b)
  if (!values.length) return []
  const min = values[0], max = values[values.length-1]
  if (min === max) return [{min,max:null,count:values.length}]
  // Rounded, equal intervals up to P90, with an open final interval for the tail.
  const upper = quantile(values,.9)!
  const step0 = ((upper>min ? upper : max) - min) / 6
  const power = 10 ** Math.floor(Math.log10(step0))
  const factor = [1,2,2.5,5,10].find(n=>n*power >= step0) ?? 10
  const step = Math.max(.01,power*factor), start = Math.floor(min/step)*step
  const size = Math.min(8, Math.floor((max-start)/step)+1)
  const bins = Array.from({length:size}, (_,i)=>({min:start+i*step,max:i===size-1?null:start+(i+1)*step,count:0}))
  for (const n of values) bins[Math.min(bins.length-1, Math.floor((n-start)/step))].count++
  return bins
}
export function groupOffers(rows: Observation[], by: 'company' | 'title') {
  const groups = new Map<string, {key:string;label:string;values:number[]}>()
  for (const row of rows) {
    const label=row.job[by]?.trim().replace(/\s+/g,' ')
    if (!label || (by === 'company' && /^(?:работодатель|компания) не указан[а]?$/iu.test(label))) continue
    const key=label.toLocaleLowerCase('ru')
    const group = groups.get(key) ?? { key,label,values:[] }
    group.values.push(row.amount)
    groups.set(key,group)
  }
  return [...groups.values()].map(group=>({
    key:group.key,label:group.label,count:group.values.length,
    median:quantile(group.values.sort((a,b)=>a-b),.5)!,
  })).sort((a,b)=>b.count-a.count || a.label.localeCompare(b.label,'ru'))
}
