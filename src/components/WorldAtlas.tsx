import { ChevronLeft, ChevronRight, Globe2, MapPin, Move, ArrowDownRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CountryFacet } from '../types'

interface Globe {
  update(rows: CountryFacet[]): void
  turn(step: number): void
  center(code: string): void
}
const countryNames = new Intl.DisplayNames(['ru'], { type: 'region' })

export function WorldAtlas({ countries, country, onChoose }: { countries: CountryFacet[]; country: string; onChoose: (code: string) => void }) {
  const holder = useRef<HTMLDivElement>(null)
  const globe = useRef<Globe | undefined>(undefined)
  const latest = useRef(countries)
  const [marked, setMarked] = useState(country === 'all' ? '' : country)
  const [ready, setReady] = useState(false)
  useEffect(() => { latest.current = countries; globe.current?.update(countries) }, [countries])
  useEffect(() => {
    if (!holder.current) return
    const host = holder.current
    const controller = new AbortController()
    const modulePath = import.meta.env.BASE_URL + 'atlas-globe.js'
    import(/* @vite-ignore */ modulePath).then(async module => {
      if (controller.signal.aborted) return
      const api: Globe | undefined = await module.mountGlobe(host, setMarked, controller.signal)
      if (controller.signal.aborted || !api) return
      globe.current = api
      api.update(latest.current)
      setReady(true)
    }).catch(() => { /* The local globe image and country picker work without WebGL. */ })
    return () => { controller.abort(); globe.current = undefined }
  }, [])
  const row = countries.find(item => item.code === marked)
  const name = row?.name ?? (marked && /^[A-Z]{2}$/.test(marked) ? countryNames.of(marked) : '')
  return <section className="map-stage" aria-label="Интерактивная карта вакансий">
    <div className="map-title"><i/>Карта вакансий</div>
    <div className="globe-frame"><img className="globe-poster" src={import.meta.env.BASE_URL+'atlas-globe.webp'} alt="" /><div className="globe-webgl" ref={holder}/></div>
    <div className="map-controls">{ready && <><button type="button" aria-label="Повернуть карту на запад" onClick={() => globe.current?.turn(-30)}><ChevronLeft size={16}/></button><button type="button" aria-label="Повернуть карту на восток" onClick={() => globe.current?.turn(30)}><ChevronRight size={16}/></button></>}</div>
    <div className="map-picker"><Globe2 size={15}/><select aria-label="Страна на карте" value={marked} onChange={e => {setMarked(e.target.value); globe.current?.center(e.target.value)}}>
      <option value="">Выбрать страну</option>
      {marked && !row && <option value={marked}>{name}</option>}
      {countries.filter(c=>/^[A-Z]{2}$/.test(c.code) && c.code !== 'WW').map(c=><option value={c.code} key={c.code}>{c.name} · {c.count}</option>)}
    </select></div>
    {marked && <div className="map-pop"><div><MapPin size={15}/><strong>{name}</strong><button aria-label="Закрыть страну" onClick={()=>setMarked('')}>×</button></div><button className="map-open" onClick={()=>onChoose(marked)}>Вакансии · {row?.count ?? 0}<ArrowDownRight size={14}/></button></div>}
    {ready && <small className="map-help"><Move size={12}/> Вращайте глобус</small>}
  </section>
}
