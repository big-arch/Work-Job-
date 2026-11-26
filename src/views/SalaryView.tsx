import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Building2, ChevronDown, ChevronRight, CircleHelp, Globe2, Layers3, Search, Wallet, X } from 'lucide-react'
import { domains, type Domain, type Salary, type Vacancy } from '../types'
import { matchesDomain } from '../lib/creativeRoles'
import { domainLabels } from '../lib/utils'
import { distribution, groupOffers, measureNames, periodNames, quantile, quotedValue, salaryKey, taxNames, type Measure } from '../lib/salaryMarket'

type Slice = 'market' | 'company' | 'title'
const number = new Intl.NumberFormat('ru-RU', {maximumFractionDigits:1})
function money(n: number | null, code: string) {
  if (n === null) return '—'
  const symbol:Record<string,string> = {RUB:'₽',USD:'$',EUR:'€',GBP:'£',KZT:'₸'}
  return number.format(n)+' '+(symbol[code] ?? code)
}
function pairLabel(key: string) {
  const [code,unit,tax]=key.split('|')
  return [code,periodNames[unit as Salary['period']],taxNames[tax as Salary['taxBasis']]].join(' · ')
}

export function SalaryView({items,loading,checked,onOpen}:{
  items:Vacancy[]; loading:boolean;checked?:string | null;onOpen:(job:Vacancy)=>void
}) {
  const [domain,setDomain] = useState<Domain | ''>('')
  const [country,setCountry] = useState('')
  const [selection,setSelection] = useState('')
  const [measure,setMeasure] = useState<Measure>('min')
  const [slice,setSlice] = useState<Slice>('market')
  const [group,setGroup] = useState('')
  const [text,setText] = useState('')
  const [bin,setBin] = useState<number|null>(null)
  const [offerQuery,setOfferQuery] = useState('')
  const [limit,setLimit] = useState(8)
  const [groupLimit,setGroupLimit] = useState(10)
  const [showUnspecified,setShowUnspecified] = useState(false)
  const countries = useMemo(()=>[...new Map(items.filter(j=>j.countryCode && j.country).map(j=>[j.countryCode!,j.country!])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'ru')),[items])
  const region = useMemo(()=>items.filter(j=>(!country || j.countryCode===country) && (!domain || matchesDomain(j,domain))),[items,country,domain])
  const cohorts = useMemo(()=>{
    const counts = new Map<string,number>()
    for(const j of region){const key=salaryKey(j.salary);if(key) counts.set(key,(counts.get(key)??0)+1)}
    return [...counts].sort((a,b)=>b[1]-a[1])
  },[region])
  const cohort = cohorts.some(c=>c[0]===selection) ? selection : (cohorts.find(c=>c[0].startsWith('RUB|month|'))??cohorts[0])?.[0] ?? ''
  const [currency,unit] = cohort.split('|')
  const base = useMemo(()=>region.filter(j=>cohort && salaryKey(j.salary)===cohort),[region,cohort])
  const unclassified = useMemo(()=>region.filter(j=>!salaryKey(j.salary) && /\d/.test(j.salary.text || '')),[region])
  const rows = useMemo(()=>base.flatMap(job=>{
    const amount=quotedValue(job.salary,measure)
    return amount===null?[]:[{job,amount}]
  }),[base,measure])
  const sorted = useMemo(()=>rows.map(row=>row.amount).sort((a,b)=>a-b),[rows])
  const bars = useMemo(()=>distribution(rows),[rows])
  const groups = useMemo(()=>slice==='market'?[]:groupOffers(rows,slice),[slice,rows])
  const matching = groups.filter(g=>g.label.toLocaleLowerCase('ru').includes(text.trim().toLocaleLowerCase('ru')))
  const activeGroup = matching.find(g=>g.key===group)
  const available = rows.filter(row=>{
    if (slice==='market' && bin!==null && bars[bin]) return row.amount >= bars[bin].min && (bars[bin].max===null || row.amount < bars[bin].max!)
    if (slice!=='market' && activeGroup) return row.job[slice].trim().replace(/\s+/g,' ').toLocaleLowerCase('ru')===activeGroup.key
    return true
  })
  const rawQuery=offerQuery.trim().toLocaleLowerCase('ru')
  const active = showUnspecified ? unclassified.filter(j=>(j.company+' '+j.title).toLocaleLowerCase('ru').includes(rawQuery)) : available.map(row=>row.job)
  function clearDetails() {setGroup('');setBin(null);setText('');setLimit(8);setGroupLimit(10);setShowUnspecified(false);setOfferQuery('')}
  const clearFilter=()=>{setGroup('');setBin(null);setShowUnspecified(false);setLimit(8)}
  const median=quantile(sorted,.5), p25=quantile(sorted,.25), p75=quantile(sorted,.75)
  const gap = activeGroup && median && activeGroup.count >= 3 ? Math.round((activeGroup.median / median - 1) * 100) : null
  const rangeText=(b:typeof bars[number])=>b.max===null?'от '+money(b.min,currency):money(b.min,currency)+' – < '+money(b.max,currency)
  return <section className="pay-view">
    <header className="pay-heading"><div><h1>Зарплаты</h1><p>Сколько предлагают работодатели в открытых вакансиях Work &amp; Job.</p></div>
      {loading && <small className="pay-loading" role="status">Обновляем выборку…</small>}{checked&&<span className="pay-date"><i/>Последняя сверка источника <time dateTime={checked}>{new Date(checked).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</time></span>}</header>
    <div className="pay-controls">
      <label>Страна<select value={country} onChange={e=>{setCountry(e.target.value);clearDetails()}}><option value="">Все страны</option>{countries.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
      <label>Направление<select aria-label="Направление" value={domain} onChange={e=>{setDomain(e.target.value as Domain | '');clearDetails()}}><option value="">Все направления</option>{domains.map(id=><option key={id} value={id}>{domainLabels[id]}</option>)}</select></label>
      <label>Условия оплаты<select value={cohort} onChange={e=>{setSelection(e.target.value);clearDetails()}}>{!cohorts.length&&<option value="">Нет сопоставимых сумм</option>}{cohorts.map(([key,n])=><option key={key} value={key}>{pairLabel(key)} ({number.format(n)})</option>)}</select></label>
      <label>Сравнивать по<select value={measure} onChange={e=>{setMeasure(e.target.value as Measure);clearDetails()}}>{Object.entries(measureNames).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
    </div>
    <div className="pay-summary" aria-live="polite"><div className="pay-main-value"><span>{measure==='min'?'Медиана нижней границы':measure==='max'?'Медиана верхней границы':'Медиана середин вилок'}</span><strong key={cohort+measure+country}>{money(median,currency)}</strong><small>{cohort?pairLabel(cohort):loading?'Ожидаем данные':'Нет сопоставимых сумм'}</small></div>
      <div><span>Центральные 50% предложений</span><b>{p25!==null && p75!==null ? money(p25,currency)+' — '+money(p75,currency):'—'}</b><small>От 25-го до 75-го процентиля</small></div>
      <div><span>В расчёте</span><b>{number.format(rows.length)}</b><small>из {number.format(region.length)} объявлений в выбранном направлении и географии</small></div></div>
    <div className="pay-switch" aria-label="Разрез зарплат">{([['market','Рынок',Globe2],['company','Компании',Building2],['title','Должности',Layers3]] as const).map(([id,label,Icon])=><button key={id} aria-pressed={slice===id} onClick={()=>{setSlice(id);clearDetails()}}><Icon size={16}/>{label}</button>)}</div>
    <div className="pay-layout">
      <section className="pay-panel" aria-label="Сравнение зарплат"><div className="pay-panel-head"><h2>{slice==='market'?'Распределение предложений':slice==='company'?'Сравнение компаний':'Сравнение должностей'}</h2>{!!rows.length&&<span>{slice==='market'?number.format(rows.length):number.format(groups.length)}</span>}</div>
        {!rows.length ? <p className="pay-empty">{loading?'Загружаем вакансии…':'Для этих условий нет значений. Попробуйте другую границу или страну.'}</p> : slice==='market' ?
          <><p className="pay-hint">Выберите столбец, чтобы прочитать вакансии в этом диапазоне.</p>
            <div className="pay-bars" aria-label="Количество предложений по диапазонам оплаты">{bars.map((b,i)=><button key={i} type="button" aria-pressed={i===bin} title={rangeText(b)+' · '+b.count} aria-label={rangeText(b)+', предложений '+b.count} onClick={()=>{setBin(i===bin?null:i);setLimit(8);setShowUnspecified(false)}}>
              <span className="pay-bar-track"><i style={{height:Math.max(2,100*b.count/Math.max(...bars.map(x=>x.count)))+'%'}}/><b>{number.format(b.count)}</b></span>
              <small>{Intl.NumberFormat('ru-RU',{notation:'compact',maximumFractionDigits:1}).format(b.min)}{i===bars.length-1?'+':''}</small></button>)}</div>
            <p className="pay-axis">{measureNames[measure]} · {currency} {periodNames[unit as Salary['period']]}</p></> :
          <><label className="pay-group-search"><Search size={16}/><input value={text} onChange={e=>{setText(e.target.value);setGroup('');setGroupLimit(10);setLimit(8);setShowUnspecified(false)}} aria-label={slice==='company'?'Найти компанию':'Найти должность'} placeholder={slice==='company'?'Найти компанию':'Найти должность'}/></label>
            <div className="pay-table"><div className="pay-column-head"><span>{slice==='company'?'Компания':'Должность'}</span><span>Вакансий</span><span>Медиана</span></div>
            {matching.slice(0,groupLimit).map(g=><button key={g.key} aria-pressed={activeGroup?.key===g.key} onClick={()=>{setGroup(group===g.key?'':g.key);setShowUnspecified(false);setLimit(8)}}><span>{g.label}</span><span>{number.format(g.count)}</span><b>{money(g.median,currency)}<ChevronRight size={13}/></b></button>)}</div>
            {activeGroup && <div className="pay-comparison" aria-live="polite"><span>{activeGroup.label}</span><strong>{money(activeGroup.median,currency)}</strong><small>{gap===null?'В группе меньше трёх вакансий':gap===0?'Совпадает с медианой рынка в выбранной группе':Math.abs(gap)+'% '+(gap>0?'выше':'ниже')+' медианы рынка в выбранной группе'}</small></div>}
            {!matching.length&&<p className="pay-empty">Совпадений нет.</p>}
            {matching.length>groupLimit&&<button className="pay-more" onClick={()=>setGroupLimit(n=>n+20)}>Показать ещё <ChevronDown size={15}/></button>}</>}
      </section>
      <section className="pay-panel pay-evidence"><div className="pay-panel-head"><h2>Вакансии в выборке</h2><span>{number.format(active.length)}</span></div>
        {(activeGroup || bin!==null || showUnspecified)&&<button className="pay-chip" onClick={clearFilter}>{showUnspecified?'Без условий для сравнения':activeGroup?.label || (bars[bin!] && rangeText(bars[bin!]))}<X size={14}/></button>}
        {showUnspecified&&<label className="pay-group-search"><Search size={16}/><input aria-label="Найти по компании или должности" placeholder="Компания или должность" value={offerQuery} onChange={e=>{setOfferQuery(e.target.value);setLimit(8)}}/></label>}
        {active.slice(0,limit).map(job=><button type="button" className="pay-job" key={job.id} onClick={()=>onOpen(job)}><span><strong>{job.title}</strong><small>{job.company}</small></span><b>{job.salary.text || money(quotedValue(job.salary,measure),currency)} <ArrowUpRight size={14}/></b></button>)}
        {!active.length&&<p className="pay-empty">Пока нет вакансий для выбранных условий.</p>}
        {active.length>limit&&<button className="pay-more" onClick={()=>setLimit(n=>n+12)}>Ещё вакансии <ChevronDown size={15}/></button>}</section>
    </div>
    <details className="pay-method"><summary><CircleHelp size={17}/> Как рассчитаны показатели <ChevronDown size={16}/></summary><p>Повторы одной ссылки или ID учитываются один раз. Одну позицию могут опубликовать на разных площадках. Нижнюю и верхнюю границы считаем отдельно. Середина вилки требует обеих границ. Валюта, период и налоговый режим одинаковы внутри каждой группы. Поле «налоги не уточнены» означает, что условия до и после вычета могут различаться.</p><p>Медиана делит упорядоченные предложения пополам. По одной вакансии видна только сумма этого предложения. Здесь показаны опубликованные условия подключённых источников. Фактические выплаты могут отличаться.</p></details>
    {unclassified.length>0&&<button className="pay-unclassified" aria-pressed={showUnspecified} onClick={()=>{setShowUnspecified(!showUnspecified);setOfferQuery('');setGroup('');setBin(null);setLimit(8);document.querySelector('.pay-evidence')?.scrollIntoView({block:'start'})}}><Wallet size={17}/> Сумма указана без всех условий сравнения · {number.format(unclassified.length)} <ArrowDownRight size={16}/></button>}
  </section>
}
