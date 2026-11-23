import test from 'node:test'
import assert from 'node:assert/strict'
import { catalogResponse } from './src/lib/catalogResponse'
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
  const list=(extra:Partial<SearchFilters>)=>catalogResponse(items,{...filters,...extra},[],base.verifiedAt).items.map(j=>j.id)
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
