import { PartialListings } from '../server/partialListings'
import { currentListing } from '../src/lib/freshness'
import { gzipSync } from 'node:zlib'
import { mkdir, writeFile } from 'node:fs/promises'
import type { SearchFilters, SourceHealth, Vacancy } from '../src/types'
import { providers, restrictedSources } from '../server/registry'
import { appConfig } from '../server/config'
import { boards } from '../server/providers/cityBoards'
import { normalizeSearch } from '../server/normalize'
import type { PublicCatalog } from '../src/lib/publicCatalogTypes'

const defaults: SearchFilters = {q:'',source:'all',country:'all',domain:'all',workFormat:'all',sort:'relevance'}
const fetchedAt = new Date().toISOString()
const catalog: PublicCatalog = {version:1,fetchedAt,items:[],matches:{},sources:[]}
const byId = new Map<string,Vacancy>()
const matches = new Map<string,Set<string>>()
const publicIds = new Set(['egis','sixt','endava','ramboll','aecom','yandex','kaspersky','habr','trudvsem','remotive','remoteok','arbeitnow','jobicy','wwr','greenhouse','ashby','lever'])
const publicChannels = new Set(appConfig.telegramChannels.filter(name=>!appConfig.telegramGroups.includes(name)).map(name=>'telegram:'+name))
const publicProviders = providers.filter(p=>publicIds.has(p.id)||publicChannels.has(p.id))
const next = [...publicProviders]
async function collect() {
  for (let provider = next.shift(); provider; provider = next.shift()) {
    const ids = new Set<string>()
    const smart = boards.some(b => b.id===provider.id)
    const queries = smart ? ['', 'BIM'] : provider.id==='habr' ? ['', 'BIM', 'Revit', 'Python', 'Product Designer'] : ['']
    let successes=0, partial=false
    for (const q of queries) {
      try {
        let jobs: Vacancy[]
        try {
          jobs = await provider.fetch({...defaults,q})
          successes++
        } catch (error) {
          if (!(error instanceof PartialListings) || !error.jobs.length) throw error
          jobs = error.jobs
          successes++
          partial = true
        }
        for (const job of jobs) {
          if(!currentListing(job) || !/^https?:\/\//.test(job.url))continue
          ids.add(job.id)
          byId.set(job.id,job)
          if(q) {
            const query=normalizeSearch(q)
            if(!matches.has(query)) matches.set(query,new Set())
            matches.get(query)!.add(job.id)
          }
        }
      } catch (error) { console.log('Unavailable feed/query:',provider.id,q||'(latest)',error instanceof Error ? error.name : 'error') }
    }
    const status:SourceHealth['status'] = !partial && successes===queries.length?'online':successes?'degraded':'unavailable'
    catalog.sources.push({id:provider.id, name:provider.name,kind:provider.kind,homeUrl:provider.homeUrl,
      note:provider.note,status,count:ids.size,error:!partial && successes===queries.length?null:successes?'Часть страниц недоступна. Показаны полученные записи.':'Источник не ответил при обновлении лент.',
      fetchedAt:successes?fetchedAt:null})
    console.log(provider.id,status,ids.size)
  }
}
await Promise.all(Array.from({length:6},()=>collect()))
catalog.items=[...byId.values()]
catalog.matches=Object.fromEntries([...matches].map(([key,ids])=>[key,[...ids]]))
catalog.sources.push(...restrictedSources)
if(!catalog.items.length)throw Error('No public records collected; keeping the previous deployment')
await mkdir('dist/feeds',{recursive:true})
const json = JSON.stringify(catalog)
await Promise.all([writeFile('dist/feeds/catalog.json',json),writeFile('dist/feeds/catalog.json.gz',gzipSync(json,{level:7}))])
console.log('Published feed records:',catalog.items.length)
