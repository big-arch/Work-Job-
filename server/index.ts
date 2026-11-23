import express from 'express'
import { createHash } from 'node:crypto'
import type { Request, Response } from 'express'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { aggregate, markClosed, sourceRegistry } from './aggregate'
import type { SearchFilters } from '../src/types'

import { providers, restrictedSources } from './registry'
import { boards, boardDetail } from './providers/cityBoards'
import { telegramDetail } from './providers/telegram'
import { superjobDetail } from './providers/russianBoards'
import { hhDetail } from './providers/boards'

const app = express()
const instance = createHash('sha256').update(resolve('.').toLowerCase()).digest('hex')
const port = Number(process.env.PORT ?? 8787)
const host = process.env.HOST ?? '127.0.0.1'

app.disable('x-powered-by')
app.use(express.json({ limit: '32kb' }))

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, service: 'atlas-career-api', instance, time: new Date().toISOString() })
})

app.get('/api/sources', (_request, response) => {
  response.json({ items: sourceRegistry() })
})

app.get('/api/vacancies', async (request: Request, response: Response) => {
  const query = request.query
  const filters: SearchFilters = {
    q: typeof query.q === 'string' ? query.q.slice(0, 160) : '',
    city: typeof query.city === 'string' ? query.city.slice(0, 40) : '',
    domain: ['it', 'bim', 'design', 'other'].includes(String(query.domain)) ? query.domain as SearchFilters['domain'] : 'all',
    workFormat: ['remote', 'hybrid', 'office', 'unspecified'].includes(String(query.workFormat)) ? query.workFormat as SearchFilters['workFormat'] : 'all',
    country: typeof query.country === 'string' ? query.country.slice(0, 40) : 'all',
    source: (query.source === 'telegram' || providers.some(p => p.id === query.source) || restrictedSources.some(p => p.id === query.source)) ? query.source as SearchFilters['source'] : 'all',
    sort: query.sort === 'recent' ? 'recent' : 'relevance',
  }
  try {
    response.setHeader('Cache-Control', 'private, max-age=30')
    response.json(await aggregate(filters, query.phase === 'cache'))
  } catch (error) {
    console.error(error)
    response.status(500).json({ error: 'Не удалось собрать вакансии. Попробуйте ещё раз.' })
  }
})

app.get('/api/vacancies/:source/:id', async (request, response) => {
  const { source, id } = request.params
  const board = boards.find(item => item.id === source)
  const isTelegram = source === 'telegram' && /^[a-z0-9_]{4,32}:\d+$/.test(id)
  if (!isTelegram && (!(board || source === 'hh' || source === 'superjob') || !/^\d{1,24}$/.test(id))) {
    response.sendStatus(404)
    return
  }
  response.setHeader('Cache-Control', 'no-store')
  try {
    response.json(await (board ? boardDetail(board, id) : isTelegram ? telegramDetail(id) : source === 'superjob' ? superjobDetail(id) : hhDetail(id)))
  } catch (e) {
    if ([404, 410].includes((e as { status?: number }).status ?? 0)) {
      markClosed(source + ':' + id)
      response.status(410).json({ error: 'Источник снял объявление с публикации.' })
    } else response.status(503).json({ error: 'Не удалось обновить карточку у источника.' })
  }
})

app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'API endpoint не найден' })
})

const clientEntry = resolve('dist/index.html')
if (existsSync(clientEntry)) {
  app.use(express.static(resolve('dist')))
  app.get(/.*/, (_request, response) => {
    response.sendFile(clientEntry)
  })
}

app.listen(port, host, () => {
  console.log(`Work & Job: http://${host}:${port}`)
})
