import test from 'node:test'
import assert from 'node:assert/strict'
import { detectDomain, filterAndSort } from './server/normalize'
import { telegramVacancy } from './server/providers/telegram'
import { creativeQuery, matchesDomain } from './src/lib/creativeRoles'
import { jobProfile } from './src/lib/jobProfile'
import { catalogResponse, projectCatalog, sourceCoverage } from './src/lib/catalogResponse'
import { currentListing, feedLifetime } from './src/lib/freshness'
import { distribution, groupOffers, quantile, quotedValue, salaryKey } from './src/lib/salaryMarket'
import { emptySalary, type SearchFilters, type Vacancy } from './src/types'
import { numericSalary } from './server/salary'

const now = Date.now()
const base: Vacancy = { id:'a',externalId:'a',title:'Инженер',company:'Бюро',source:'trudvsem',sourceName:'Источник',sourceUrl:'https://example.org',
  companyLogo:null,description:'',city:null,country:'Россия',countryCode:'RU',workFormat:'office',domain:'other',salary:emptySalary,
  url:'https://example.org/jobs?id=1',applyUrl:'https://example.org/jobs?id=1',publishedAt:new Date(now).toISOString(),
  verifiedAt:new Date(now).toISOString(),tags:[],isTelegram:false,isDemo:false }
const filters:SearchFilters={q:'',source:'all',domain:'all',country:'all',workFormat:'all',sort:'recent'}
test('only current, published non-demo records pass',()=>{
  assert.ok(currentListing(base,now))
  for(const patch of [{verifiedAt:new Date(now-feedLifetime).toISOString()},{verifiedAt:'bad'},{validThrough:'1998-01-01'},{isDemo:true},
    {isTelegram:true,publishedAt:new Date(now-31*86400_000).toISOString()}]) assert.ok(!currentListing({...base,...patch},now))
})
test('all directions includes other, tracking duplicates collapse and distinct query IDs survive',()=>{
  const items=[base,{...base,id:'b',url:base.url+'&utm_source=email'},
    {...base,id:'c',url:'https://example.org/jobs?id=2',salary:numericSalary(70000,null,'RUR','MONTH')},
    {...base,id:'old',url:'https://example.org/jobs?id=3',validThrough:'2000-01-01'}]
  const list=(extra:Partial<SearchFilters>)=>catalogResponse(items,{...filters,...extra},[]).items.map(j=>j.id)
  assert.deepEqual(list({}),['a','c'])
  assert.deepEqual(list({domain:'it'}),[])
  assert.deepEqual(list({withSalary:'1'}),['c'])
  assert.deepEqual(list({postedWithin:'7',country:'DE'}),[])
})
test('separate units, tax bases, invalid and one-sided salaries',()=>{
  const monthly=numericSalary(100000,150000,'RUR','MONTH')
  const floor=numericSalary(100000,undefined,'RUB','month')
  assert.equal(salaryKey(monthly),'RUB|month|not_specified')
  assert.equal(salaryKey({...monthly,period:'not_specified'}),'')
  assert.notEqual(salaryKey({...monthly,taxBasis:'gross'}),salaryKey(monthly))
  assert.notEqual(salaryKey({...monthly,currency:'USD',period:'year'}),salaryKey(monthly))
  assert.equal(quotedValue(monthly,'mid'),125000)
  assert.equal(quotedValue(floor,'mid'),null)
  assert.equal(quotedValue(floor,'max'),null)
  assert.equal(salaryKey(numericSalary(150,100,'RUB','MONTH')),'')
})
test('quartiles, bins and employer/title drilldowns use the same offers',()=>{
  const values=[100,200,200,900]
  const rows=values.map((amount,i)=>({amount,job:{...base,company:i===3?'Завод':'Бюро',title:i<2?'Архитектор':'Инженер'}}))
  assert.equal(quantile(values,.5),200); assert.equal(quantile(values,.25),175); assert.equal(quantile([], .5),null)
  const bins=distribution(rows)
  assert.equal(bins.reduce((n,b)=>n+b.count,0),4)
  for(const b of bins) assert.equal(b.count,values.filter(n=>n>=b.min && (b.max===null||n<b.max)).length)
  assert.deepEqual(groupOffers(rows,'company').map(g=>[g.label,g.count,g.median]),[['Бюро',3,200],['Завод',1,900]])
  assert.equal(groupOffers(rows,'title').find(g=>g.label==='Архитектор')?.median,150)
  assert.equal(distribution([{amount:5,job:base}]).length,1)
})

const job = (title: string, detail = ''): Vacancy => ({
  ...base, id:title, title, description:detail, domain:detectDomain(title,detail),
  url:'https://example.org/jobs/'+encodeURIComponent(title),
})

test('bilingual 3D and animation discover overlapping roles without party, engineering or HR jobs', () => {
  const dual = job('3Д-аниматор персонажей','Blender и Maya')
  const visual = job('Senior Environment Artist','Unreal Engine')
  const motion = job('Моушн-дизайнер','After Effects')
  assert.equal(dual.domain,'animation')
  assert.ok(matchesDomain(dual,'3d'))
  for (const q of ['3D','3Д','3D Artist','3Д-художник']) {
    assert.deepEqual(new Set(filterAndSort([dual,visual,motion],{...filters,q}).map(j=>j.id)),new Set([dual.id,visual.id]))
  }
  for (const q of ['Анимация','Аниматор','animator','Motion Designer']) {
    assert.deepEqual(new Set(filterAndSort([dual,visual,motion],{...filters,q}).map(j=>j.id)),new Set([dual.id,motion.id]))
  }
  assert.deepEqual(filterAndSort([dual,visual,motion],{...filters,q:'3d animator'}).map(j=>j.id),[dual.id])
  assert.deepEqual(creativeQuery('Character Artist'),[])
  for (const title of ['Аниматор детских праздников','Hotel Animator','Animateur HSE','Animation Programmer','ML Technical Lead','Technical Director - Electrical Engineer','Safety, Health & Environment Supervisor','Crane Rigger','3D Printer Technician','Civil 3D Engineer','VFX Recruiter','Software Developer']) {
    const v={...job(title,'Работа с animation и Blender'),matchedQuery:'анимация'}
    assert.ok(!matchesDomain(v,'3d') && !matchesDomain(v,'animation'),title)
    assert.equal(filterAndSort([v],{...filters,q:'анимация'}).length,0)
  }
})

test('creative tool facets, filtered rows and vacancy skills agree', () => {
  const a=job('3D Animator','Blender, Maya, Unreal Engine')
  const b=job('Gameplay Animator','After Effects, Autodesk Maya')
  const c=job('Motion Designer','Mayan culture')
  const data=projectCatalog([a,b,c],{...filters,domain:'animation',skill:'Maya'},[])
  assert.deepEqual(new Set(data.items.map(x=>x.title)),new Set([a.title,b.title]))
  assert.equal(data.facets.skills?.find(s=>s.name==='Maya')?.count,2)
  assert.equal(data.facets.domains.find(s=>s.id==='3d')?.count,1)
  assert.deepEqual(jobProfile(c,null).skills,[])
  assert.ok(!currentListing(job('General Application — Animation Team')))
})

test('a successful empty feed, failed refresh, expired cache and partial coverage remain distinguishable', () => {
  const ok = {id:'ubisoft',name:'Studio',kind:'ats' as const,homeUrl:base.sourceUrl,status:'online' as const,count:0,error:null,fetchedAt:base.verifiedAt,note:''}
  const lost = {...ok,id:'2k',status:'unavailable' as const,fetchedAt:null}
  const stale = {...lost,fetchedAt:new Date(now-feedLifetime-2000).toISOString()}
  assert.equal(sourceCoverage([ok], 'all').status,'ready')
  assert.equal(sourceCoverage([lost], 'all').status,'unavailable')
  assert.equal(sourceCoverage([stale], 'all').status,'stale')
  assert.equal(sourceCoverage([ok,lost], 'all').status,'partial')
  assert.equal(sourceCoverage([ok,lost], '2k').status,'unavailable')
  assert.equal(catalogResponse([],filters,[lost]).fetchedAt,null)
  assert.equal(catalogResponse([],filters,[stale]).fetchedAt,stale.fetchedAt)
  assert.equal(projectCatalog([base],filters,[ok],now+feedLifetime).total,0)
})

test('CG Telegram channels distinguish hiring, channel promotions, résumés and closed messages', () => {
  const text='Вакансия: 3D-аниматор (Roblox / Blender)\nЛокация: Москва\nЗаработная плата: $50–100 за видео\nИщем аниматора в команду.'
  const parse=(s:string)=>telegramVacancy('cgfreelance',{id:454,date:base.verifiedAt,text:s})
  const vacancy=parse(text)!
  assert.equal(vacancy.title,'3D-аниматор (Roblox / Blender)')
  assert.equal(vacancy.domain,'animation');assert.equal(vacancy.salary.text,'$50–100 за видео')
  assert.equal(parse('Нужен 2D-аниматор на постоянную работу\n💰 5 000 ₽ за ролик\nЗадачи в Toon Boom')?.salary.text,'5 000 ₽ за ролик')
  assert.equal(vacancy.url,'https://t.me/cgfreelance/454')
  for (const prefix of ['#резюме\nИщу работу','Приглашаем в закрытый канал','Вакансия закрыта']) assert.equal(parse(prefix+'\n'+text),null)
})
