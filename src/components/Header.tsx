import { ArrowUpRight, Bookmark, ChartNoAxesColumnIncreasing, Compass, MapPinned, RadioTower, Search } from 'lucide-react'

export type AppView = 'search' | 'saved' | 'cities' | 'sources' | 'stats'
const nav = [
  { id: 'search', label: 'Вакансии', icon: Search },
  { id: 'cities', label: 'Города', icon: MapPinned },
  { id: 'stats', label: 'Статистика', icon: ChartNoAxesColumnIncreasing },
  { id: 'sources', label: 'Источники', icon: RadioTower },
  { id: 'saved', label: 'Сохранённое', icon: Bookmark },
] as const
export function Header({view,savedCount,onlineSources,loadingSources,onNavigate}: {
  view: AppView; savedCount: number; onlineSources: number; loadingSources: boolean; onNavigate: (view:AppView)=>void
}) {
  return <header className="site-header atlas-nav">
    <a className="atlas-brand" href="#search" onClick={()=>{onNavigate('search');window.scrollTo(0,0)}}><span><Compass size={27} strokeWidth={2.5}/></span>Work &amp; Job</a>
    <nav className="atlas-links" aria-label="Основная навигация">{nav.map(({id,label,icon:Icon})=>
      <a key={id} href={'#'+id} onClick={()=>onNavigate(id)} aria-current={view===id?'page':undefined}><Icon size={15}/><span>{label}</span>{id==='saved' && savedCount>0 && <b>{savedCount}</b>}</a>
    )}</nav>
    <a className="network-status" href="#sources" onClick={()=>onNavigate('sources')}><i/>{onlineSources ? 'Источников онлайн · '+onlineSources : loadingSources ? 'Обновление' : 'Статус сети'}<ArrowUpRight size={13}/></a>
  </header>
}
