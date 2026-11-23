import { useState } from 'react'
import { ArrowUpRight, Check, ChevronDown, Copy, RadioTower, RefreshCw, Settings2 } from 'lucide-react'
import type { SourceHealth } from '../types'
import { publishedMode } from '../lib/siteMode'
import { formatDate } from '../lib/utils'

const guides:Record<string,{title:string;steps:string[];url:string;link:string;command?:string}>={
  hh:{title:'HeadHunter',steps:['Зарегистрируйте приложение и опишите публичный каталог, чтение текста и переход к оригиналу. Согласуйте с HH этот способ показа с учётом пунктов 4.3 и 4.6 соглашения.','После согласования получите токен приложения. Выполните команду из папки проекта и введите токен и контактный User-Agent.'],url:'https://dev.hh.ru/admin/developer_agreement',link:'Соглашение и кабинет HH',command:'python configure-source.py hh'},
  superjob:{title:'SuperJob',steps:['Зарегистрируйте приложение на портале SuperJob, указав адрес сайта и сценарий показа вакансий.','После выдачи секретного ключа выполните команду из папки проекта. Адаптер передаст ключ в заголовке X-Api-App-Id.'],url:'https://api.superjob.ru/',link:'Портал разработчиков SuperJob',command:'python configure-source.py superjob'},
  telegram:{title:'Группы Telegram',steps:['Создайте приложение на my.telegram.org → API development tools. Подготовьте API ID и API hash. Для чтения используйте отдельный аккаунт с доступом к выбранным публичным группам.','В терминале проекта установите Telethon и запустите настройку. Телефон, код входа и пароль 2FA вводятся локально. Имена групп перечислены в TELEGRAM_GROUPS.'],url:'https://my.telegram.org/',link:'Приложения Telegram',command:'python -m pip install "telethon>=1.36,<2"\npython configure-source.py telegram'},
  rabota:{title:'Работа.ру',steps:['Обратитесь в отдел партнёрских проектов. Укажите адрес сайта, желаемые поля и порядок удаления закрытых вакансий.','Запросите согласованный формат и условия использования. После получения спецификации потребуется адаптер под выданную ленту.'],url:'https://www.rabota.ru/contacts-info/',link:'Контакты Работа.ру'},
  linkedin:{title:'LinkedIn',steps:['Обратитесь в Talent Solutions и опишите поиск публичных вакансий для стороннего каталога.','Уточните у площадки, доступен ли экспорт для этого сценария. Для выданного интерфейса потребуется интеграция.'],url:'https://business.linkedin.com/talent-solutions',link:'LinkedIn Talent Solutions'},
  indeed:{title:'Indeed',steps:['Опишите в партнёрской программе каталог вакансий и показ описаний на вашем сайте.','Получите подтверждение подходящего продукта и его документацию. Затем можно подключить конкретный интерфейс.'],url:'https://docs.indeed.com/',link:'Indeed Partner Docs'},
}
export function SourcesView({sources,loading,onRefresh}:{sources:SourceHealth[];loading:boolean;onRefresh:()=>void}){
  const [tab,setTab]=useState<'all'|'online'|'issue'|'setup'>('all')
  const [copied,setCopied]=useState('')
  const active=sources.filter(s=>s.kind!=='restricted')
  const pending=sources.filter(s=>s.kind==='restricted')
  const visible=active.filter(s=>tab==='all'||(tab==='online'&&s.status==='online')||(tab==='issue'&&s.status==='unavailable'))
  const groups=pending.filter(s=>s.id.startsWith('telegram:'))
  const guideIds=[...new Set(pending.map(s=>s.id.startsWith('telegram:')?'telegram':s.id))]
  return <div className="sources-view">
    <div className="page-intro inline"><div><span className="eyebrow"><RadioTower size={15}/> Сеть Work & Job</span><h1>Источники <span>вакансий</span></h1><p>Проверьте доступность площадки или откройте инструкцию по подключению.</p></div><button className="secondary-button" onClick={onRefresh} disabled={loading}><RefreshCw size={15} className={loading?'spin':''}/>Обновить статусы</button></div>
    <div className="source-tabs">{([['all','Все',sources.length],['setup','Как подключить',pending.length],['online','Онлайн',active.filter(s=>s.status==='online').length],['issue','Ошибки сети и доступа',active.filter(s=>s.status==='unavailable').length]] as const).map(([id,label,count])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label} <b>{count}</b></button>)}</div>
    {(tab==='all'||tab==='setup') && <section className="setup-section"><h2><Settings2 size={21}/> Подключение площадок</h2> {publishedMode && <p className="profile-status">Публичные ленты обновляет GitHub Actions. Инструкции с ключами относятся к серверной версии владельца.</p>}<div className="guide-rows">{guideIds.map(id=>{
      const guide=guides[id];if(!guide)return null
      return <details key={id}><summary>{guide.title}{id==='telegram'&&<small>{groups.length} групп</small>}<ChevronDown size={16}/></summary><div className="guide-body">
      <ol>{guide.steps.map(step=><li key={step}>{step}</li>)}</ol>
      {id==='telegram'&&<div className="source-handles">{groups.map(g=><a key={g.id} href={g.homeUrl} target="_blank" rel="noreferrer">@{g.id.split(':')[1]}</a>)}</div>}
      {guide.command&&<><pre><code>{guide.command+'\n.\\start-atlas.cmd restart'}</code></pre><button className="text-link" onClick={async()=>{try{await navigator.clipboard.writeText(guide.command+'\n.\\start-atlas.cmd restart');setCopied(id)}catch{setCopied('error')}}}>{copied===id?<Check size={14}/>:<Copy size={14}/>} {copied===id?'Скопировано':'Скопировать команды'}</button>{copied==='error'&&<p>Скопируйте команды из блока выше.</p>}</>}
      <a className="guide-external" href={guide.url} target="_blank" rel="noreferrer">{guide.link} <ArrowUpRight size={14}/></a></div></details>
    })}</div></section>}
    {tab!=='setup'&&<section className="connections"><h2>Подключённые источники</h2><div className="sources-grid">{visible.map(s=><article className={'source-card '+s.status} key={s.id}>
    <div className="source-card-top"><span className="source-kind">{s.kind==='telegram'?'Telegram':s.kind==='ats'?'Работодатель':'Площадка'}</span><span className={'status-badge '+s.status}>{s.status==='online'?'Онлайн':s.status==='unavailable'?'Нет ответа':s.status==='degraded'?'Задержка':'Ожидает проверки'}</span></div><h2>{s.name}</h2><p>{s.note}</p>{s.error&&<p className="source-error">{s.error}{s.id==='trudvsem'?' · Ключ не нужен. Источник будет опрошен при следующем обновлении.':''}</p>}<footer><span>{s.fetchedAt?'Получено '+s.count+' · '+formatDate(s.fetchedAt,true):'Ответ пока не получен'}</span><a href={s.homeUrl} target="_blank" rel="noreferrer" aria-label={'Открыть '+s.name}><ArrowUpRight size={17}/></a></footer></article>)}</div>{!visible.length&&<p>{loading?'Обновляем статусы…':'Источников с таким статусом нет.'}</p>}</section>}
  </div>
}
