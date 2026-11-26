import { useLayoutEffect, useRef } from 'react'
import { ArrowUpRight, Banknote, Bookmark, ChartNoAxesColumnIncreasing, Compass, MapPinned, RadioTower, Search } from 'lucide-react'

export type AppView = 'search' | 'saved' | 'cities' | 'sources' | 'stats' | 'salaries'
const nav = [
  { id: 'search', label: 'Вакансии', icon: Search },
  { id: 'cities', label: 'Города', icon: MapPinned },
  { id: 'salaries', label: 'Зарплаты', icon: Banknote },
  { id: 'stats', label: 'Статистика', icon: ChartNoAxesColumnIncreasing },
  { id: 'sources', label: 'Источники', icon: RadioTower },
  { id: 'saved', label: 'Сохранённое', icon: Bookmark },
] as const
export function Header({view,savedCount,onlineSources,loadingSources,onNavigate}: {
  view: AppView; savedCount: number; onlineSources: number; loadingSources: boolean; onNavigate: (view:AppView)=>void
}) {
  const navRef = useRef<HTMLElement>(null)
  const last = useRef(view)
  useLayoutEffect(()=>{
    const previous = navRef.current?.querySelector('a[href="#'+last.current+'"]')
    const current = navRef.current?.querySelector('a[aria-current="page"]')
    last.current = view
    if (!previous || !current || previous===current || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const from=previous.getBoundingClientRect(), to=current.getBoundingClientRect()
    const animation=current.querySelector('.nav-current')?.animate?.([
      {transform:'translate('+(from.left-to.left)+'px,'+(from.top-to.top)+'px) scaleX('+from.width/to.width+')'},
      {transform:'none'},
    ],{duration:180,easing:'ease-out'})
    return ()=>animation?.cancel()
  },[view])
  return <header className="site-header atlas-nav">
    <a className="atlas-brand" href="#search" onClick={()=>{onNavigate('search');window.scrollTo(0,0)}}><span><Compass size={27} strokeWidth={2.5}/></span>Work &amp; Job</a>
    <nav ref={navRef} className="atlas-links" aria-label="Основная навигация">{nav.map(({id,label,icon:Icon})=>
      <a key={id} href={'#'+id} onClick={()=>onNavigate(id)} aria-current={view===id?'page':undefined}>{view===id && <i className="nav-current" aria-hidden="true"/>}<Icon size={15}/><span>{label}</span>{id==='saved' && savedCount>0 && <b>{savedCount}</b>}</a>
    )}</nav>
    <a className="network-status" href="#sources" onClick={()=>onNavigate('sources')}><i/>{onlineSources ? 'Источников онлайн · '+onlineSources : loadingSources ? 'Обновление' : 'Статус сети'}<ArrowUpRight size={13}/></a>
  </header>
}
