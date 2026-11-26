import { ArrowUpRight, Bookmark, BriefcaseBusiness, Building2, CalendarDays, Check, ClipboardList, FileCheck2, Globe2, MapPin, Share2, Wallet, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { studios } from '../../server/providers/greenhouse'
import { trudKey, registryUrl } from '../lib/trudLink'
import { publishedMode } from '../lib/siteMode'
import { jobProfile, type JobDetails } from '../lib/jobProfile'
import type { Vacancy } from '../types'
import { VacancyPager, type PagerProps } from './VacancyPager'
import { companyInitials, conditionLabel, domainLabels, formatDate, workFormatLabels } from '../lib/utils'

interface VacancyDetailProps {
  vacancy:Vacancy; saved:boolean; onToggleSaved:()=>void; onClosed:(id:string)=>void; onShare:()=>void
}
export function VacancyDetail({ vacancy:summary,saved,onToggleSaved,onShare,onClosed }:VacancyDetailProps){
  const [detail,setDetail]=useState<JobDetails|null>(null)
  const [error,setError]=useState('')
  const [attempt,setAttempt]=useState(0)
  const [sectionIndex,setSectionIndex]=useState(0)
  const registryKey = summary.source==='trudvsem' ? trudKey(summary.url) : null
  const registerLink = registryKey ? registryUrl(registryKey) : null
  const needsDetail=studios.some(s=>s.id===summary.source) || !!registryKey || publishedMode || summary.detailPending || summary.isTelegram
  useEffect(()=>{
    if(!needsDetail)return
    const abort=new AbortController()
    async function load() {
      if(publishedMode){
        const { publishedDetail }=await import('../lib/publishedCatalog')
        return publishedDetail(summary.source,summary.externalId,registryKey)
      }
      const response=await fetch('/api/vacancies/'+summary.source+'/'+encodeURIComponent(registryKey ?? summary.externalId),{signal:abort.signal,cache:'no-store'})
      if(!response.ok)throw Object.assign(Error('Ошибка источника'),{status:response.status})
      return await response.json() as JobDetails
    }
    load().then(value=>{if(!abort.signal.aborted)setDetail(value)}).catch(reason=>{
      if(abort.signal.aborted)return
      if(reason?.status===410){onClosed(summary.id);setError('Объявление снято с публикации.')}
      else if(reason?.status===409) setError('В текущей ленте этой записи нет. Актуальность можно уточнить у первоисточника.')
      else setError('Не удалось обновить объявление у источника.')
    })
    return ()=>abort.abort()
  },[summary.id,summary.source,summary.externalId,registryKey,needsDetail,attempt,onClosed])
  const v=summary
  const p=jobProfile(v,detail)
  const current=p.sections[sectionIndex]??p.sections[0]
  const location=[...new Set([v.city,v.country].filter(Boolean))].join(', ')
  const loading=needsDetail&&!detail&&!error
  const facts=[
    [MapPin,'Место работы',location],
    [Globe2,'Формат',v.workFormat==='unspecified'?'':workFormatLabels[v.workFormat]],
    [BriefcaseBusiness,'Занятость',p.employment],
    [ClipboardList,'Опыт',p.experience],
    [Building2,'Отрасль',detail?.industry||v.industry],
    [Building2,'Подразделение',detail?.department||v.department],
    [MapPin,'Адрес офиса',detail?.address||v.address],
    [Wallet,'Оплата',p.salary],
  ] as const
  return <article className="detail-content vacancy-profile">
    <div className="profile-tools"><span className={'domain-tag '+v.domain}>{domainLabels[v.domain]}</span><div>
      <button className="icon-button" onClick={onShare} aria-label="Скопировать ссылку на вакансию"><Share2 size={16}/></button>
      <button className="icon-button" onClick={onToggleSaved} aria-pressed={saved} aria-label={saved?'Удалить из сохранённого':'Сохранить вакансию'}><Bookmark size={16} fill={saved?'currentColor':'none'}/></button>
    </div></div>
    <h2>{v.title}</h2><div className="profile-company"><span className="company-logo">{v.companyLogo?<img src={v.companyLogo} alt=""/>:/не указан/i.test(v.company)?<Building2 size={15}/>:companyInitials(v.company)}</span><strong>{v.company}</strong><small>{v.sourceName===v.company?'Сайт работодателя':v.sourceName}</small></div>
    <div className="detail-actions"><a className="primary-button apply-button" href={detail?.url||v.url} target="_blank" rel="noreferrer">{v.isTelegram?'Открыть сообщение в Telegram':'Перейти к первоисточнику'} <ArrowUpRight size={17}/></a><button className="secondary-button" onClick={onToggleSaved}>{saved?<Check size={15}/>:<Bookmark size={15}/>} {saved?'Сохранено':'Сохранить'}</button></div>
    {v.isTelegram && <p className="publication-note">Публикация в Telegram. Статус найма уточните у автора.</p>}
    {loading && <p role="status" className="profile-status">Загружаем условия из первоисточника…</p>}
    {error && <p role="status">{error} <button className="text-link" onClick={()=>{setError('');setAttempt(n=>n+1)}}>Повторить</button></p>}
    <section className="profile-facts"><h3>Условия вакансии</h3><dl>{facts.map(([Icon,label,value])=>value?<div key={label}><dt><Icon size={15}/>{label}</dt><dd>{conditionLabel(value)}</dd></div>:null)}</dl>
    {!p.salary && <p className="missing-pay">Размер оплаты в доступных данных не указан.</p>}</section>
    {p.skills.length>0 && <section className="profile-skills"><h3>Навыки из объявления</h3><div>{p.skills.map(s=><span key={s}>{s}</span>)}</div></section>}
    {p.sections.length>0 && <section className="description-section"><h3>{'Текст объявления'}</h3>
    {p.sections.length>1 && <div className="section-switch" aria-label="Разделы объявления">{p.sections.map((s,i)=><button key={i} onClick={()=>setSectionIndex(i)} aria-pressed={current===s}>{s.label}</button>)}</div>}
    {current && <div key={current.label+sectionIndex} className="description-text expanded"><p>{current.text}</p></div>}</section>}
    {!loading && !error && !current && <p>Полный текст доступен на странице работодателя.</p>}
    {p.docs.length>0 && <details className="relocation-details"><summary>Переезд и право на работу</summary>{p.docs.map((text,i)=><blockquote key={i}>{text}</blockquote>)}</details>}
    <footer className="detail-verification"><div><CalendarDays size={15}/>Опубликовано · {formatDate(v.publishedAt)}</div><div><FileCheck2 size={15}/>Сверено · {formatDate(detail?.verifiedAt??v.verifiedAt,true)}</div></footer>
    {registerLink&&<a className="registry-link" href={registerLink} target="_blank" rel="noreferrer">Проверить запись в открытом реестре Роструда <ArrowUpRight size={14}/></a>}

  </article>
}

interface VacancyDetailDialogProps {
  pager?: PagerProps
  vacancy: Vacancy | null
  open: boolean
  saved: boolean
  onClose: () => void
  onToggleSaved: () => void
  onClosed: (id: string) => void
  onShare: () => void
}

export function VacancyDetailDialog({ vacancy, pager, open, saved, onClose, onToggleSaved, onShare, onClosed }: VacancyDetailDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && vacancy && !dialog.open) dialog.showModal()
    if (open && vacancy) dialog.scrollTop = 0
    if ((!open || !vacancy) && dialog.open) dialog.close()
  }, [open, vacancy])

  return (
    <dialog ref={ref} className="vacancy-dialog" aria-labelledby="mobile-vacancy-title" onClose={onClose}>
      <div className="mobile-dialog-top"><span id="mobile-vacancy-title">Карточка вакансии</span><form method="dialog"><button className="icon-button" aria-label="Закрыть вакансию"><X size={20} /></button></form></div>
      {pager && <VacancyPager {...pager}/>}
      {vacancy && open && <VacancyDetail key={vacancy.id} vacancy={vacancy} onClosed={onClosed} saved={saved} onToggleSaved={onToggleSaved} onShare={onShare} />}
    </dialog>
  )
}
