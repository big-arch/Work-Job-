import { ArrowUpRight, Compass, Search } from 'lucide-react'
import type { CountryFacet } from '../types'
import { WorldAtlas } from './WorldAtlas'

export function SearchHero({draft,onDraftChange,onSubmit,onQuickQuery,countries,country,onCountry}: {
  draft:string; onDraftChange:(v:string)=>void; onSubmit:()=>void; onQuickQuery:(q:string)=>void
  countries:CountryFacet[]; country:string; onCountry:(v:string)=>void
}) {
  return <section className="navigator-hero" aria-labelledby="hero-heading">
    <div className="navigator-copy">
      <span className="hero-overline"><Compass size={14}/> Карьерный навигатор</span>
      <h1 id="hero-heading">Где работать<br/><em>дальше?</em></h1>
      <p>Инженерия, IT, дизайн, 3D и анимация.<br className="wide-break"/> Вакансии в России и по всему миру.</p>
      <form className="navigator-search" role="search" onSubmit={e=>{e.preventDefault();onSubmit()}}>
        <Search size={19}/><input id="vacancy-search" type="search" aria-label="Должность, технология или компания" placeholder="Должность, навык или компания" value={draft} onChange={e=>onDraftChange(e.target.value)}/>
        <button type="submit">Найти <ArrowUpRight size={15}/></button>
      </form>
      <div className="hero-links"><span>Например</span>{['BIM','3D Artist','Аниматор','Python'].map(q=><button key={q} onClick={()=>onQuickQuery(q)}>{q}</button>)}</div>
    </div>
    <WorldAtlas countries={countries} country={country} onChoose={onCountry}/>
  </section>
}
