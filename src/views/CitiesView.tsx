import { ArrowRight, ArrowUpRight, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cities } from '../lib/cities'

type City = typeof cities[number]

function CityFacts({ city, moment }: { city: City; moment: Date }) {
  const time = new Intl.DateTimeFormat('ru', { timeZone: city.zone, timeZoneName: 'shortOffset', hour: '2-digit', minute: '2-digit' }).format(moment)
  return <dl className="city-facts">
    <div><dt>Валюта</dt><dd>{city.currency}</dd></div>
    <div><dt>Местное время</dt><dd>{time}</dd></div>
    <div><dt>Городская поездка</dt><dd><b>{city.fare}</b><p>{city.fareNote}</p><a href={city.fareUrl} target="_blank" rel="noreferrer">{city.transport} <ArrowUpRight size={15}/></a></dd></div>
    <div><dt>Аренда жилья</dt><dd><p>{city.housingNote}</p><a href={city.housingUrl} target="_blank" rel="noreferrer">{city.housing} <ArrowUpRight size={15}/></a></dd></div>
    <div><dt>Работа и документы</dt><dd><p>{city.guideNote}</p><a href={city.guideUrl} target="_blank" rel="noreferrer">{city.guide} <ArrowUpRight size={15}/></a></dd></div>
  </dl>
}

export function CitiesView({ onCity }: { onCity: (city: string) => void }) {
  const [moment, setMoment] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setMoment(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])
  const [first, setFirst] = useState(cities[0])
  const [second, setSecond] = useState(cities[1])
  const [compare, setCompare] = useState(false)
  function choose(city: City, right: boolean) {
    if (right) {
      if (city.id === first.id) setFirst(second)
      setSecond(city)
    } else {
      if (city.id === second.id) setSecond(first)
      setFirst(city)
    }
  }
  return <section className="cities-view">
    <header className="page-intro"><h1>Города <span>для работы</span></h1><p>Посмотрите вакансии по адресу работы, сравните транспорт и найдите официальные правила переезда.</p></header>
    <div className="guide-toolbar"><div className="direction-bar">{cities.map(city => <button key={city.id} aria-pressed={city.id === first.id} onClick={() => choose(city, false)}>{city.name}</button>)}</div>
      <button type="button" className="secondary-button" aria-pressed={compare} onClick={() => setCompare(!compare)}>{compare ? 'Завершить сравнение' : 'Сравнить два города'}</button></div>
    <div className={'guide-grid' + (compare ? ' comparing' : '')}>
      {(compare ? [first, second] : [first]).map((city, i) => <article className="guide-card" key={i}>
        <header className={'guide-head ' + city.id}><div><span><MapPin size={17}/>{city.country}</span><h2>{city.name}</h2></div>
          {i === 1 && <label>Второй город<select value={city.id} onChange={event => choose(cities.find(c => c.id === event.target.value)!, true)}>{cities.filter(c => c.id !== first.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
        </header>
        <div className="guide-body"><p>{city.tip}</p><CityFacts city={city} moment={moment}/><button type="button" className="primary-button" onClick={() => onCity(city.id)}>Вакансии в городе <ArrowRight size={17}/></button></div>
      </article>)}
    </div>
    <p className="guide-date">Транспортные тарифы сверены 23 ноября 2026 года. Стоимость указана в местной валюте.</p>
  </section>
}
