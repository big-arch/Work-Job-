import { AlertCircle, Bookmark, CheckCircle2, Filter, RefreshCw, SearchX, SlidersHorizontal } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { FiltersDrawer, FiltersPanel } from './components/FiltersPanel'
import { MarketStrip, StatsView } from './views/StatsView'
import { Directions } from './components/Directions'
import { VacancyPager } from './components/VacancyPager'
import { sourceCoverage } from './lib/catalogResponse'
import { formatDate } from './lib/utils'
import { Header } from './components/Header'
import type { AppView } from './components/Header'
import { SearchHero } from './components/SearchHero'
import { DetailPlaceholder, EmptyState, ErrorState, VacancySkeleton } from './components/States'
const VacancyDetail = lazy(() => import('./components/VacancyDetail').then(m => ({default:m.VacancyDetail})))
const VacancyDetailDialog = lazy(() => import('./components/VacancyDetail').then(m => ({default:m.VacancyDetailDialog})))
import { VacancyList } from './components/VacancyList'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useSaved } from './hooks/useSaved'
import { useVacancies } from './hooks/useVacancies'
import { cities } from './lib/cities'
const SalaryMarketPage = lazy(() => import('./views/SalaryMarketPage').then(m=>({default:m.SalaryMarketPage})))
const CitiesView = lazy(() => import('./views/CitiesView').then(m => ({default:m.CitiesView})))
const SourcesView = lazy(() => import('./views/SourcesView').then(m => ({default:m.SourcesView})))
import { domains, sourceIds, type SearchFilters, type Vacancy } from './types'

const defaultFilters: SearchFilters = {
  q: '', domain: 'all', workFormat: 'all', country: 'all', source: 'all', sort: 'relevance',
}

const views: AppView[] = ['search','cities','salaries','stats','sources','saved']
const getView = () => views.find(id=>id===window.location.hash.slice(1)) ?? 'search'

function readFilters(): SearchFilters {
  const p=new URLSearchParams(window.location.search)
  const domain=p.get('domain'), workFormat=p.get('workFormat')
  const source = p.get('source') || ''
  return { ...defaultFilters, skill:p.get('skill')?.slice(0,45)||'', withSalary:p.get('withSalary')==='1'?'1':'',postedWithin:p.get('postedWithin')==='7'?'7':'', q:p.get('q')?.slice(0,160)??'', country:p.get('country')?.slice(0,40)||'all',
    domain:domains.some(id=>id===domain)?domain as SearchFilters['domain']:'all',
    workFormat:['office','remote','hybrid','unspecified'].includes(workFormat??'')?workFormat as SearchFilters['workFormat']:'all',
    city:p.get('city')?.slice(0,40)||'', source:sourceIds.some(id=>id===source)||/^telegram:[a-z0-9_]{4,32}$/.test(source) ? source as SearchFilters['source'] : 'all',
    sort:p.get('sort')==='recent'?'recent':'relevance',
  }
}
function readGroup() {
  const value = new URLSearchParams(window.location.search).get("feed")
  return value === "telegram" || value === "sites" ? value : "all"
}

export default function App() {
  const [view, setView] = useState<AppView>(getView)
  const [filters, setFilters] = useState(readFilters)
  const [group, setGroup] = useState<'all' | 'sites' | 'telegram'>(readGroup)
  const [closedIds, setClosedIds] = useState<Set<string>>(() => new Set())
  const [payVacancy,setPayVacancy] = useState<Vacancy|null>(null)
  const [toast, setToast] = useState('')
  const handleClosed = useCallback((id: string) => {
    setClosedIds(current => current.has(id) ? current : new Set([...current, id]))
    setPayVacancy(null)
    setToast('Объявление отсутствует в актуальной выдаче источника')
  }, [])
  const [draft, setDraft] = useState(filters.q)
  const [reloadToken, setReloadToken] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileDetailId, setMobileDetailId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(12)
  useEffect(()=>{
    const restore=()=>{setView(getView());setPayVacancy(null);setMobileDetailId(null);setSelectedId(null);window.scrollTo(0,0)}
    const restoreSearch = () => {
      const next = readFilters()
      setFilters(next); setGroup(readGroup()); setDraft(next.q); setVisibleCount(12)
      restore()
    }
    window.addEventListener('hashchange',restore)
    window.addEventListener('popstate',restoreSearch)
    return ()=>{window.removeEventListener('hashchange',restore);window.removeEventListener('popstate',restoreSearch)}
  },[])
  const isMobile = useMediaQuery('(max-width: 980px)')
  const { data, loading, error } = useVacancies(filters, reloadToken)
  const { saved, toggleSaved, removeSaved } = useSaved()
  const savedIds = new Set(saved.map((vacancy) => vacancy.id))

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 5000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const available = useMemo(()=>(data?.items ?? []).filter(item => !closedIds.has(item.id)),[data,closedIds])
  const telegramCount = useMemo(()=>available.filter(item => item.isTelegram).length,[available])
  const items = useMemo(()=>view === 'saved' ? saved : group==='all' ? available : available.filter(item => group === 'telegram' ? item.isTelegram : !item.isTelegram),[view,saved,available,group])
  const coverage = sourceCoverage(data?.sources ?? [],filters.source,group)
  const activeVacancy = items.find((vacancy) => vacancy.id === selectedId) ?? items[0] ?? null
  const mobileVacancy = items.find((vacancy) => vacancy.id === mobileDetailId) ?? null
  const onlineSources = data?.sources.filter((source) => source.status === 'online').length ?? 0

  useEffect(() => {
    const url = new URL(window.location.href)
    if (group === 'all') url.searchParams.delete('feed')
    else url.searchParams.set('feed', group)
    window.history.replaceState(null, '', url)
  }, [group])

  const navigate = (nextView: AppView) => {
    if(window.location.hash !== '#'+nextView) window.location.hash = nextView
    setPayVacancy(null)
    setView(nextView)
    setSelectedId(null)
    setMobileDetailId(null)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const updateFilters = (next: SearchFilters) => {
    setVisibleCount(12)
    setSelectedId(null)
    setMobileDetailId(null)
    setDraft(next.q)
    if (filters.source !== next.source) setGroup('all')
    const url = new URL(window.location.href)
    for(const [key,value] of Object.entries(next)) {
      if(value && value!=='all' && !(key==='sort' && value==='relevance')) url.searchParams.set(key,value)
      else url.searchParams.delete(key)
    }
    for(const key of ['city','skill','withSalary','postedWithin']) if(!next[key as keyof SearchFilters])url.searchParams.delete(key)
    window.history.replaceState(null, '', url)
    setFilters(next)
  }

  const selectVacancy = (vacancy: Vacancy) => {
    setSelectedId(vacancy.id)
    if (isMobile) setMobileDetailId(vacancy.id)
  }

  const moveInResults = (index: number) => {
    const next = items[index]
    if (!next) return
    if (index >= visibleCount) setVisibleCount(Math.ceil((index+1)/12)*12)
    selectVacancy(next)
  }
  const pager = {index:items.findIndex(item=>item.id===(isMobile?mobileVacancy:activeVacancy)?.id),count:items.length,onMove:moveInResults}
  const toggleSave = (vacancy: Vacancy) => {
    const alreadySaved = savedIds.has(vacancy.id)
    toggleSaved(vacancy)
    setToast(alreadySaved ? 'Удалено из сохранённого' : 'Вакансия сохранена на этом устройстве')
  }

  const resetFilters = () => {
    setDraft('')
    setGroup('all')
    updateFilters(defaultFilters)
  }

  const showCatalog = () => window.requestAnimationFrame(() => document.getElementById('catalog')?.scrollIntoView({behavior:'instant',block:'start'}))
  const searchNow = (next: SearchFilters) => { updateFilters(next); showCatalog() }
  const quickQuery = (query: string) => {
    if (query === 'Remote') {
      setDraft('')
      updateFilters({ ...filters, q: '', workFormat: 'remote' })
    } else {
      setDraft(query)
      searchNow({ ...filters, q: query })
    }
  }

  const openCity = (city: string) => {
    setDraft('')
    updateFilters({ ...defaultFilters, city, sort: 'recent' })
    setGroup('all')
    navigate('search')
  }

  const shareVacancy = async (vacancy: Vacancy) => {
    try {
      await navigator.clipboard.writeText(vacancy.url)
      setToast('Ссылка на первоисточник скопирована')
    } catch {
      setToast('Не удалось скопировать ссылку. Откройте оригинал вакансии.')
    }
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Перейти к вакансиям</a>
      <Header view={view} savedCount={saved.length} onlineSources={onlineSources} loadingSources={loading} onNavigate={navigate} />
      <main id="main-content" tabIndex={-1}>
        {error && data && items.length>0 && <div className="stale-warning" role="alert"><AlertCircle size={17} /><p>Не удалось обновить данные. Показываем предыдущую выборку и статусы.</p><button type="button" onClick={() => setReloadToken(Date.now())}><RefreshCw size={15} />Повторить</button></div>}
          <div key={view}>
            {view === 'search' && (
              <>
                <SearchHero draft={draft} onDraftChange={setDraft} onSubmit={()=>searchNow({...filters,q:draft.trim()})} onQuickQuery={quickQuery} country={filters.country} countries={data?.facets.countries??[]} onCountry={country=>searchNow({...filters,country,city:''})}/>
                <MarketStrip items={items} online={onlineSources} ready={!!data} onStats={()=>navigate('stats')} onSources={()=>navigate('sources')} onTelegram={()=>{setGroup('telegram');setVisibleCount(12);showCatalog()}}/>
                {data && coverage.lastCheck && <p className="public-freshness">Последняя успешная сверка источника · {formatDate(coverage.lastCheck,true)}</p>}
                <Directions filters={filters} facets={data?.facets} onChange={updateFilters}/>
                <div className="quick-filters" aria-label="Быстрые фильтры">
                  <button aria-pressed={filters.country==='RU'} onClick={()=>updateFilters({...filters,country:filters.country==='RU'?'all':'RU',city:''})}>Россия</button>
                  <button aria-pressed={filters.withSalary==='1'} onClick={()=>updateFilters({...filters,withSalary:filters.withSalary==='1'?'':'1'})}>С зарплатой</button>
                  <button aria-pressed={filters.postedWithin==='7'} onClick={()=>updateFilters({...filters,postedWithin:filters.postedWithin==='7'?'':'7'})}>Опубликованы за неделю</button>
                  <a href="#salaries" onClick={()=>navigate('salaries')}>Сравнить зарплаты ↗</a>
                </div>
                <div className="workspace-toolbar" id="catalog"><div><h2>Каталог вакансий</h2><p aria-live="polite">{data ? `В выборке · ${items.length}` : 'Загружаем вакансии…'}</p>{filters.country !== 'all' && <button type="button" className="location-chip" aria-label="Снять фильтр страны" onClick={() => updateFilters({ ...filters, country: 'all' })}>{data?.facets.countries.find(country => country.code === filters.country)?.name ?? filters.country} ×</button>}{filters.city && <button className="location-chip" type="button" onClick={() => updateFilters({ ...filters, city: '' })}>{cities.find(city => city.id === filters.city)?.name} ×</button>}</div><button className="filter-trigger" type="button" onClick={() => setFiltersOpen(true)} aria-expanded={filtersOpen}><SlidersHorizontal size={17} />Фильтры{(filters.workFormat !== 'all' || filters.country !== 'all' || filters.source !== 'all') && <i />}</button></div>
                <div className="feed-switch" aria-label="Тип источника">{([['all', 'Все', available.length], ['sites', 'Сайты вакансий', available.length - telegramCount], ['telegram', 'Telegram', telegramCount]] as const).map(([id, label, count]) => <button key={id} type="button" aria-pressed={group === id} onClick={() => { setGroup(id); setVisibleCount(12); setSelectedId(null); setMobileDetailId(null) }}>{label} <span>{count}</span></button>)}</div>
                <div className="workspace-grid">
                  <aside className="filters-sidebar"><FiltersPanel filters={filters} sources={data?.sources ?? []} countries={data?.facets.countries ?? []} onChange={updateFilters} onReset={resetFilters} /></aside>
                  <section className="results-column" aria-label="Результаты поиска">
                    {loading && !items.length && <VacancySkeleton />}
                    {error && (!data || !items.length) && <ErrorState message={error} onRetry={() => setReloadToken(Date.now())} />}
                    {!loading && !error && items.length === 0 && (coverage.status==='ready' || coverage.status==='partial'
                      ? <EmptyState partial={coverage.status==='partial'} onReset={resetFilters}/>
                      : <ErrorState message={coverage.status==='stale' ? 'Срок проверки ленты истёк. Последняя сверка · '+formatDate(coverage.lastCheck,true) : 'Источник не подтвердил выдачу. Попробуйте повторить проверку.'} onRetry={()=>setReloadToken(Date.now())}/>)}
                    {!loading && data && coverage.status==='partial' && (items.length>0 || !error) && <p className="coverage-note">Часть источников вернула неполные данные. <a href="#sources">Статусы источников</a></p>}
                    {items.length > 0 && <>
                      {loading && <div className="updating-note"><span />Уточняем данные у источников</div>}
                      <VacancyList items={items} selectedId={activeVacancy?.id ?? null} savedIds={savedIds} visibleCount={visibleCount} onSelect={selectVacancy} onToggleSaved={toggleSave} onShowMore={() => setVisibleCount((count) => count + 12)} />
                    </>}
                  </section>
                  <aside className="detail-column" aria-label="Карточка вакансии">
                    {!isMobile && <VacancyPager {...pager}/>}
                    {activeVacancy && !isMobile ? <Suspense fallback={<DetailPlaceholder/>}><VacancyDetail onClosed={handleClosed} key={activeVacancy.id} vacancy={activeVacancy} saved={savedIds.has(activeVacancy.id)} onToggleSaved={() => toggleSave(activeVacancy)} onShare={() => void shareVacancy(activeVacancy)} /></Suspense> : <DetailPlaceholder />}
                  </aside>
                </div>
              </>
            )}

            {view === 'saved' && (
              <section className="saved-view">
                <div className="page-intro"><span className="eyebrow"><Bookmark size={14} />Личная подборка</span><h1>Сохранённые <span>вакансии</span></h1><p>Вакансии с закладкой останутся в этом браузере после перезагрузки.</p></div>
                {saved.length === 0 ? <div className="empty-state"><SearchX size={38} /><h2>Здесь пока пусто</h2><p>Сохраняйте вакансии закладкой — они останутся в браузере после перезагрузки.</p><button className="primary-button" type="button" onClick={() => navigate('search')}>Найти вакансии</button></div> : <div className="saved-layout"><section><VacancyList items={saved} selectedId={activeVacancy?.id ?? null} savedIds={savedIds} visibleCount={visibleCount} onSelect={selectVacancy} onToggleSaved={(vacancy) => { toggleSave(vacancy); if (isMobile) setMobileDetailId(null) }} onShowMore={() => setVisibleCount((count) => count + 12)} /></section><aside className="detail-column">{activeVacancy && !isMobile && <Suspense fallback={<DetailPlaceholder/>}><VacancyDetail onClosed={handleClosed} key={activeVacancy.id} vacancy={activeVacancy} saved onToggleSaved={() => { removeSaved(activeVacancy.id); setToast('Удалено из сохранённого') }} onShare={() => void shareVacancy(activeVacancy)} /></Suspense>}</aside></div>}
              </section>
            )}
            {view === 'salaries' && <Suspense fallback={<p role="status">Загружаем зарплаты…</p>}><SalaryMarketPage filters={defaultFilters} closedIds={closedIds} onOpen={setPayVacancy}/></Suspense>}
            {view === 'stats' && <StatsView items={items} filters={filters} loading={loading} onBack={()=>navigate('search')} onFilter={next=>{updateFilters(next);navigate('search');showCatalog()}}/>}
            {view === 'cities' && <Suspense fallback={<p role="status">Загружаем города…</p>}><CitiesView onCity={openCity} /></Suspense>}
            {view === 'sources' && <Suspense fallback={<p role="status">Загружаем источники…</p>}><SourcesView sources={data?.sources ?? []} loading={loading} onRefresh={() => setReloadToken(Date.now())} /></Suspense>}
          </div>
      </main>

      <FiltersDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} filters={filters} sources={data?.sources ?? []} countries={data?.facets.countries ?? []} onChange={updateFilters} onReset={resetFilters} />
      {view==='salaries' && payVacancy && <Suspense fallback={null}><VacancyDetailDialog vacancy={payVacancy} open saved={savedIds.has(payVacancy.id)} onClosed={handleClosed} onClose={()=>setPayVacancy(null)} onShare={()=>void shareVacancy(payVacancy)} onToggleSaved={()=>toggleSave(payVacancy)}/></Suspense>}
      {isMobile && mobileVacancy && <Suspense fallback={null}><VacancyDetailDialog pager={pager} onClosed={handleClosed} vacancy={mobileVacancy} open={isMobile && Boolean(mobileVacancy)} saved={mobileVacancy ? savedIds.has(mobileVacancy.id) : false} onClose={() => setMobileDetailId(null)} onToggleSaved={() => mobileVacancy && toggleSave(mobileVacancy)} onShare={() => mobileVacancy && void shareVacancy(mobileVacancy)} /></Suspense>}
      <div className={`toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite" aria-atomic="true">{toast && <><CheckCircle2 size={18} />{toast}</>}</div>
      <button className={`mobile-filter-fab ${view === 'search' ? 'visible' : ''}`} type="button" onClick={() => setFiltersOpen(true)} aria-label="Открыть фильтры"><Filter size={19} /></button>
    </>
  )
}
