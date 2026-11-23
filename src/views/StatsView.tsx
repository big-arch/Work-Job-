import { ArrowDownRight, ArrowUpRight, BriefcaseBusiness, Building2, Globe2, RadioTower, Send } from 'lucide-react'
import type { SearchFilters, Vacancy, WorkFormat } from '../types'
import { workFormatLabels } from '../lib/utils'

function counts(items:Vacancy[],key:(v:Vacancy)=>string|null) {
  const totals=new Map<string,number>()
  for(const item of items){const value=key(item);if(value)totals.set(value,(totals.get(value)??0)+1)}
  return [...totals].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
}
const number = (n:number)=>n.toLocaleString('ru-RU')
export function MarketStrip({items,online,ready,onStats,onSources,onTelegram}:{
  items:Vacancy[];online:number;ready:boolean;onStats:()=>void;onSources:()=>void;onTelegram:()=>void
}){
  const entries=[
    {Icon:BriefcaseBusiness,label:'Объявлений в выдаче',value:items.length,click:onStats},
    {Icon:Globe2,label:'Стран в выборке',value:countryTotals(items).length,click:onStats},
    {Icon:RadioTower,label:'Источников онлайн',value:online,click:onSources},
    {Icon:Send,label:'Публикаций Telegram',value:items.filter(v=>v.isTelegram).length,click:onTelegram},
  ]
  return <section className="market-strip" aria-label="Статистика выборки">{entries.map(({Icon,label,value,click})=><button type="button" key={label} onClick={click}>
    <span className="metric-icon"><Icon size={19}/></span><div><strong>{ready?number(value):'…'}</strong><small>{label}</small></div><ArrowUpRight className="metric-arrow" size={14}/>
  </button>)}</section>
}
function countryTotals(items:Vacancy[]) {
  return counts(items,v=>v.countryCode && /^[A-Z]{2}$/.test(v.countryCode) && !['WW','EU'].includes(v.countryCode)?v.countryCode:null)
}
export function StatsView({items,filters,loading,onFilter,onBack}:{
  items:Vacancy[];filters:SearchFilters;loading:boolean;onFilter:(next:SearchFilters)=>void;onBack:()=>void
}){
  const countries=countryTotals(items)
  const companies=counts(items,v=>v.company && !/не указан|неизвест/i.test(v.company)?v.company:null).slice(0,8)
  const formats=counts(items,v=>v.workFormat)
  const salaries=items.filter(v=>v.salary.min!=null||v.salary.max!=null||Boolean(v.salary.text)).length
  const names=new Intl.DisplayNames(['ru'],{type:'region'})
  const max=countries[0]?.[1]||1
  return <section className="market-view">
    <div className="page-intro inline"><div><span className="eyebrow"><Globe2 size={15}/> Аналитика вакансий</span><h1>Статистика <span>поиска</span></h1><p>{filters.q?'Запрос «'+filters.q+'». ':''}{loading?'Обновляем выборку. ':''}По текущим фильтрам — {number(items.length)} объявлений.</p></div><button className="secondary-button" onClick={onBack}>К вакансиям <ArrowUpRight size={16}/></button></div>
    <div className="chart-grid"><article><h2><Globe2 size={20}/> География найма</h2><p>Нажмите страну, чтобы открыть её вакансии.</p>{countries.length?countries.slice(0,10).map(([code,count])=><button className="chart-bar" key={code} onClick={()=>onFilter({...filters,country:code,city:''})}><span>{names.of(code)}</span><i><b style={{width:100*count/max+'%'}}/></i><strong>{number(count)}</strong><ArrowDownRight size={14}/></button>):<p>В выборке пока нет географии.</p>}</article>
    <article><h2><BriefcaseBusiness size={20}/> Формат работы</h2><p>Доля объявлений от всей текущей выборки.</p>{formats.map(([id,count])=><button className="chart-bar" key={id} onClick={()=>onFilter({...filters,workFormat:id as WorkFormat})}><span>{workFormatLabels[id as WorkFormat]}</span><i><b style={{width:100*count/items.length+'%'}}/></i><strong>{Math.round(100*count/items.length)}%</strong><ArrowDownRight size={14}/></button>)}
    <div className="salary-coverage"><strong>{number(salaries)} <small>из {number(items.length)}</small></strong><p>объявлений с оплатой в полях источника</p></div></article>
    <article className="chart-companies"><h2><Building2 size={20}/> Работодатели в выборке</h2><ul>{companies.map(([name,count])=><li key={name}><span>{name}</span><strong>{number(count)}</strong></li>)}</ul>{!companies.length&&<p>Работодатели пока не указаны.</p>}</article></div>
  </section>
}
