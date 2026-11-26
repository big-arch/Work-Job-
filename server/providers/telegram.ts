import * as cheerio from 'cheerio'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { describedPay } from '../../src/lib/describedPay'
import { emptySalary, type Vacancy } from '../../src/types'
import { fetchText, plainText } from '../http'
import { detectDomain, inferLocation, inferWorkFormat } from '../normalize'
import { appConfig } from '../config'
import type { ProviderDefinition } from '../registry'

const runFile = promisify(execFile)
const reader = fileURLToPath(new URL('./telegram_group.py', import.meta.url))
const names: Record<string, string> = {
  bimvac: 'BIM-вакансии · РФ', wasa_job: 'Вакансии для архитекторов', archhunterchannel: 'Арх.Хантер',
  archhireglobal: 'ArchiHire', haltura_arhitetura: 'Халтура-Архитектура',
  architect_vacancies: 'Архитекторы', arkhitektory_chat: 'Архитектор · Дизайнер · Художник',
  vacancii_construction: 'Вакансии в строительстве', architectsandconstructors: 'Архитекторы и конструкторы России', job_in_project: 'Заказ проекта и сметы',
  bimwork: 'BIM вакансии · INT LINES', bim_tim_work: 'Проектирование · Revit, Renga, BIM',
  cgfreelance: 'CG Freelance', gamedevjob: 'Работа в геймдеве', gamedevjobs: 'Gamedev Jobs',
  job_python: 'Python Job', remoteit: 'Remote IT', jobjava: 'Job Java',
}
const month = 30 * 24 * 60 * 60_000
const hiring = /#(?:ваканси|vacanc|job\b|hiring)|ваканси[яиюй]|ищем\s+(?:в\s+команду|сотрудник|[\p{L}-]+)|ищет\s+(?:в команду|инженера|архитектора|специалиста)|требуется|нуж[а-яё]{2,4} (?:опытный |ведущий |главный )?(?:инженер|специалист|архитектор|проектировщик|разработчик|bim)|в поиске (?:ведущего |главного )?(?:проектировщик|инженер|архитектор|специалист|bim)|приглаша[а-яё]+ в команду|обязанности|мы предлагаем|we.re hiring|responsibilities|apply now|how to apply|нуж[а-яё]* (?:[23][dд][- ]?)?(?:аниматор|художник|композер|визуализатор|моделлер)/iu
const closed = /(?:ваканси[яию]|позици[яию]|набор)\s+(?:уже\s+)?(?:закрыт|в архиве|приостановлен|заверш[её]н)|#закрыта|поиск\s+(?:заверш[её]н|приостановлен)|(?:position|vacancy|role) (?:is |has been )?(?:closed|filled)|no longer accepting/i
const editorial = /подборка.{0,36}ваканси|(?:лучшие|новые|топ).{0,18}вакансии за (?:неделю|месяц)|полезных постов|каталог семейств|зарабатывайте на своих|воркшоп|мастер-класс|нетворкинг|как (?:оформить|составить) (?:резюме|linkedin)|(?:приглашаем|вступайте) в (?:закрытый )?канал|как найти работу|дайджест|#сообщество|стоимость размещения|правила (?:публикации|чата)/i
const resume = /(?:^|\n)\s*(?:#резюме(?:\s|$)|ищу (?:работу|проект|подработку)|looking for (?:a job|work))/i
const role = /bim[-‑–— ]|тим[-‑–— ]|архитектор|проектировщик|инженер|разработчик|дизайнер|моделлер|моделер|developer|engineer|designer|architect|devops|artist|animator|rigger|художник|аниматор|визуализатор|generalist|композер|моушн/i
type Post = { id: number; date: string; text: string }
export function telegramVacancy(username: string, post: Post): Vacancy | null {
  const date = Date.parse(post.date)
  const description = post.text.trim()
  if (!Number.isSafeInteger(post.id) || post.id < 1 || !Number.isFinite(date) || date < Date.now() - month || date > Date.now() + 60_000) return null
  if (editorial.test(description.split('\n').slice(0, 2).join(' ').slice(0, 350))) return null
  const boardPost = username === 'gamedevjobs' && /^[^\n|]{3,100}\s+\|\s+[^\n|]{3,100}\s+\|\s+[^\n|]+/i.test(description) && /https:\/\/teletype\.in\/@remoteit\//i.test(description)
  if (description.length < 45 || !(hiring.test(description) || boardPost) || closed.test(description) || resume.test(description.slice(0, 360))) return null
  if (/#сообщество|наша общественная миссия|разместить вакансию|правила (публикации|чата)|стоимость размещения|подборка вакансий|дайджест вакансий/i.test(description.slice(0, 180))) return null
  const labels = description.split('\n').map(line => line.replace(/^\s*(?:#[\p{L}\d_]+\s*)+/gu, '').trim()).filter(line => line.length > 3 && !/^https?:/i.test(line))
  const candidate = labels.slice(0, 7).find(line => role.test(line)) ?? labels[0]
  if (!candidate) return null
  const segments = candidate.split(/\s+\|\s+/)
  const structured = (username === 'remoteit' || boardPost) && segments.length === 3
  const title = (structured ? segments[0] : candidate).replace(/^[^\p{L}\d]+/u,'').replace(/^(?:вакансия|vacancy)\s*[:–-]\s*/i, '').split(/\s+#|https?:\/\//i)[0].trim().slice(0, 180)
  if (!title) return null
  const tags = [...description.matchAll(/#[\p{L}\d_]+/gu)].map(match => match[0]).slice(0, 24)
  const city = description.match(/(?:город|локация|location)\s*[:–-]\s*([^\n]{2,100})/i)?.[1]
    ?? description.match(/Москва|Москве|Санкт-Петербург|Екатеринбург|Новосибирск/i)?.[0]?.replace(/^Москве$/i, 'Москва')
  const workFormat = inferWorkFormat(description)
  const geo = inferLocation(structured && /^REMOTE RU$/i.test(segments[1]) ? 'Russia' : city, workFormat === 'remote')
  const explicitCompany = description.match(/(?:компания|company)\s*[:–-]\s*([^\n]{2,140})/i)?.[1]?.trim()
    ?? description.match(/(?:компани[яию]|бюро)\s*["«]([^"»\n]{2,90})["»]/i)?.[1]
    ?? title.match(/компанию\s+([A-ZА-ЯЁ][\p{L}\d& .-]*?)(?:\s*\(|$)/u)?.[1]?.trim()
  const externalId = username + ':' + post.id
  const url = 'https://t.me/' + username + '/' + post.id
  return {
    id: 'telegram:' + externalId, externalId, source: 'telegram', sourceName: 'Telegram · ' + (names[username] ?? username),
    sourceUrl: 'https://t.me/' + username, title, company: explicitCompany || (structured ? segments[2].split(/\s+#|\s+https?:/)[0].trim() : 'Работодатель не указан'),
    companyLogo: null, description, ...geo, workFormat, domain: detectDomain(title, description, tags),
    salary: { ...emptySalary, text: describedPay(description) },
    publishedAt: post.date, verifiedAt: new Date().toISOString(), url, applyUrl: url, tags, isDemo: false, isTelegram: true,
  }
}

function parsePost($: cheerio.CheerioAPI, element: Parameters<cheerio.CheerioAPI>[0], username: string): Post | null {
  const node = $(element)
  const [owner, id] = (node.attr('data-post') ?? '').split('/')
  if (owner?.toLowerCase() !== username || !/^\d+$/.test(id ?? '')) return null
  const text = plainText(node.find('.tgme_widget_message_text').first().html())
  const preview = node.find('.link_preview_description,.link_preview_title').text()
  const date = node.find('time[datetime]').first().attr('datetime') ?? ''
  return { id: Number(id), date, text: closed.test(preview) ? '' : text }
}

async function publicPosts(username: string) {
  const jobs: Vacancy[] = []
  const base = 'https://t.me/s/' + username
  let before = 0
  while (true) {
    const $ = cheerio.load(await fetchText(base + (before ? '?before=' + before : ''), { Accept: 'text/html' }, 10_000))
    const nodes = $('.tgme_widget_message[data-post]').toArray()
    if (!before && !nodes.length) throw Error('Telegram не предоставил публичную ленту')
    const posts = nodes.map(node => parsePost($, node, username)).filter((post): post is Post => !!post)
    if (!posts.length) break
    for (const post of posts) {
      const vacancy = telegramVacancy(username, post)
      if (vacancy) jobs.push(vacancy)
    }
    const oldest = Math.min(...posts.map(post => post.id))
    if (posts.some(post => Date.parse(post.date) < Date.now() - month) || (before && oldest >= before)) break
    before = oldest
  }
  return jobs
}

const groupAccess = !!(process.env.ATLAS_TG_API_ID && process.env.ATLAS_TG_API_HASH && process.env.ATLAS_TG_SESSION)
async function groupPosts(username: string, id?: number): Promise<Post[]> {
  if (!groupAccess) throw Error('Требуется авторизованная сессия Telegram для чтения группы')
  try {
    const { stdout } = await runFile(process.env.ATLAS_TG_PYTHON || 'python', [reader, username, ...(id ? [String(id)] : [])],
      { timeout: 45_000, maxBuffer: 16 * 1024 * 1024, windowsHide: true, encoding: 'utf8', env: { ...process.env, TELEGRAM_GROUPS: appConfig.telegramGroups.join(',') } })
    return JSON.parse(stdout) as Post[]
  } catch { throw Error('Не удалось прочитать группу через Telegram API. Проверьте доступ и установку Telethon.') }
}

export const telegramProviders: ProviderDefinition[] = [...new Set([...appConfig.telegramChannels, ...appConfig.telegramGroups])].map(username => {
  const group = appConfig.telegramGroups.includes(username)
  return {
    id: 'telegram:' + username, name: names[username] ?? '@' + username, kind: group && !groupAccess ? 'restricted' : 'telegram',
    homeUrl: 'https://t.me/' + username, cacheTtlMs: 5 * 60_000,
    note: group ? (groupAccess ? 'Публичная группа. Вакансии из истории за 30 дней.' : 'Публичная группа. Для получения истории нужна авторизованная сессия Telegram.')
      : 'Публичный канал @' + username + '. Публикации за последние 30 дней. Статус найма уточняется у автора.',
    async fetch() {
      if (!group) return publicPosts(username)
      const posts = await groupPosts(username)
      return posts.map(post => telegramVacancy(username, post)).filter((job): job is Vacancy => !!job)
    },
  }
})

export async function telegramDetail(externalId: string) {
  const [username, rawId] = externalId.split(':')
  if (!telegramProviders.some(source => source.id === 'telegram:' + username) || !/^\d+$/.test(rawId))
    throw Object.assign(Error('Неизвестная публикация'), { status: 404 })
  let post: Post | undefined | null
  if (appConfig.telegramGroups.includes(username)) [post] = await groupPosts(username, Number(rawId))
  else {
    const $ = cheerio.load(await fetchText('https://t.me/' + username + '/' + rawId + '?embed=1', { Accept: 'text/html' }, 10_000))
    const node = $('.tgme_widget_message[data-post]').first()[0]
    if (!node && !/post not found|message not found/i.test($('.tgme_widget_message_error').text())) throw Error('Telegram не подтвердил состояние сообщения')
    post = node && parsePost($, node, username)
  }
  if (!post || String(post.id) !== rawId) throw Object.assign(Error('Публикация недоступна'), { status: 410 })
  const job = telegramVacancy(username, post)
  if (!job) throw Object.assign(Error('Объявление удалено, устарело или закрыто'), { status: 410 })
  return { description: job.description, url: job.url, verifiedAt: job.verifiedAt }
}
