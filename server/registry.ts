import type { ProviderDefinition, SourceHealth } from '../src/types'
import { fetchArbeitnow, fetchHh, fetchRemoteOk, fetchRemotive } from './providers/boards'
import { appConfig } from './config'
import { cityProviders } from './providers/cityBoards'
import { atsProviders } from './providers/ats'
import { telegramProviders } from './providers/telegram'
import { fetchHabr, fetchSuperjob } from './providers/russianBoards'
import { fetchTrudvsem } from './providers/trudvsem'
import { fetchJobicy, fetchWeWorkRemotely } from './providers/feeds'

export type { ProviderDefinition } from '../src/types'

export const providers: ProviderDefinition[] = [
  ...cityProviders,
  ...(appConfig.leverBoards.length ? [{ id: 'lever', name: 'Lever', kind: 'ats' as const, homeUrl: 'https://jobs.lever.co/' + encodeURIComponent(appConfig.leverBoards[0]), note: 'Официальные объявления настроенных работодателей.', cacheTtlMs: 60 * 60_000, fetch: atsProviders.lever }] : []),
  { id: 'trudvsem', name: 'Работа России', homeUrl: 'https://trudvsem.ru', kind: 'job-board', queryAware: true, cacheTtlMs: 10 * 60_000, note: 'Открытые данные Роструда. Поиск по страницам в пределах лимита открытого API.', fetch: fetchTrudvsem },
  ...(appConfig.hhAccessToken ? [{
    id:'hh', name:'HeadHunter', kind:'job-board' as const, homeUrl:'https://hh.ru', note:'Официальный API приложения HH.', cacheTtlMs:15*60_000, fetch:fetchHh,
  }] : []),
  { id:'habr', name:'Хабр Карьера', kind:'job-board', homeUrl:'https://career.habr.com/vacancies/rss', note:'Официальная RSS-лента. До 100 последних результатов на запрос. Карточка содержит краткое описание из ленты.', queryAware:true, cacheTtlMs:10*60_000, fetch:fetchHabr },
  ...(appConfig.superJobKey ? [{ id:'superjob', name:'SuperJob', kind:'job-board' as const, homeUrl:'https://www.superjob.ru/', note:'API зарегистрированного приложения. До 500 результатов на запрос.', queryAware:true, cacheTtlMs:5*60_000, fetch:fetchSuperjob }] : []),
  { id: 'remotive', name: 'Remotive', kind: 'job-board', homeUrl: 'https://remotive.com', note: 'Официальный API. Атрибуция и ссылка обязательны; данные задерживаются на 24 часа.', cacheTtlMs: 6 * 60 * 60_000, fetch: fetchRemotive },
  { id: 'remoteok', name: 'Remote OK', kind: 'job-board', homeUrl: 'https://remoteok.com', note: 'Публичный JSON feed удалённой работы с обратной ссылкой.', cacheTtlMs: 6 * 60 * 60_000, fetch: fetchRemoteOk },
  { id: 'arbeitnow', name: 'Arbeitnow', kind: 'job-board', homeUrl: 'https://www.arbeitnow.com', note: 'Публичный API европейских и удалённых вакансий.', cacheTtlMs: 60 * 60_000, fetch: fetchArbeitnow },
  { id: 'jobicy', name: 'Jobicy', kind: 'job-board', homeUrl: 'https://jobicy.com', note: 'Публичный Jobicy API с обязательной атрибуцией источника.', cacheTtlMs: 60 * 60_000, fetch: fetchJobicy },
  { id: 'wwr', name: 'We Work Remotely', kind: 'job-board', homeUrl: 'https://weworkremotely.com', note: 'Официальная RSS-лента удалённой работы.', cacheTtlMs: 60 * 60_000, fetch: fetchWeWorkRemotely },
  { id: 'greenhouse', name: 'Greenhouse · Discord', kind: 'ats', homeUrl: 'https://discord.com/careers', note: 'Официальный Job Board API работодателя.', cacheTtlMs: 60 * 60_000, fetch: atsProviders.greenhouse },
  { id: 'ashby', name: 'Ashby · Linear', kind: 'ats', homeUrl: 'https://linear.app/careers', note: 'Официальный Public Job Posting API работодателя.', cacheTtlMs: 60 * 60_000, fetch: atsProviders.ashby },
  ...telegramProviders.filter(provider => provider.kind !== 'restricted'),
]

export const restrictedSources: SourceHealth[] = [
  { id: 'linkedin', name: 'LinkedIn', kind: 'restricted', homeUrl: 'https://www.linkedin.com/jobs', status: 'disabled', count: 0, error: null, fetchedAt: null, note: 'Нужен официальный партнёрский доступ. Scraping не используется.' },
  { id: 'indeed', name: 'Indeed', kind: 'restricted', homeUrl: 'https://indeed.com', status: 'disabled', count: 0, error: null, fetchedAt: null, note: 'Нужен официальный API и разрешение на перепубликацию.' },
  ...(!appConfig.hhAccessToken ? [{id:'hh',name:'HeadHunter',kind:'restricted' as const,homeUrl:'https://dev.hh.ru/',status:'disabled' as const,count:0,error:null,fetchedAt:null,note:'Нужен доступ приложения к показу вакансий в этом каталоге.'}] : []),
  ...telegramProviders.filter(provider => provider.kind === 'restricted').map(provider => ({ id: provider.id, name: provider.name, homeUrl: provider.homeUrl, note: provider.note, kind: 'restricted' as const, status: 'disabled' as const, count: 0, error: null, fetchedAt: null })),
  ...(!appConfig.superJobKey ? [{id:'superjob',name:'SuperJob',kind:'restricted' as const,homeUrl:'https://api.superjob.ru/',status:'disabled' as const,count:0,error:null,fetchedAt:null,note:'Адаптер готов. Нужен ключ зарегистрированного приложения.'}] : []),
  { id: 'rabota', name: 'Работа.ру', kind: 'restricted', homeUrl: 'https://www.rabota.ru/', status: 'disabled', count: 0, error: null, fetchedAt: null, note: 'Источник пока не предоставил проекту ленту вакансий.' },
]
