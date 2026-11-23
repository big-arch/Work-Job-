import type { Domain, SearchFilters, Vacancy, WorkFormat } from '../src/types'

import { matchesCity } from '../src/lib/cities'

const bimPattern = /\b(bim|revit|navisworks|civil\s*3d|tekla|archicad|autocad|openbim|ifc|aec|тим|проектировщик|проектировани|архитектур|инженерные\s+сети|mep|digital\s+twin)\b/i
const designPattern = /\b(ux\/?ui|ux\s|ui\s|product\s+designer|digital\s+designer|web\s+designer|graphic\s+designer|visual\s+designer|дизайнер|designer)\b/i
const itPattern = /\b(software|developer|programmer|разработчик|программист|frontend|front-end|backend|back-end|fullstack|full-stack|devops|sre|qa\b|tester|тестировщик|data\s+(engineer|analyst|scientist)|python|typescript|javascript|c#|c\+\+|golang|java\s|react|node\.?js|sql|machine\s+learning|ai\s+engineer|ml\s+engineer|mobile|ios|android|cloud\s+engineer|systems?\s+engineer|инженер\s+данных|аналитик\s+данных)\b/i

const bimAlias = /(?<![\p{L}\d])(?:бим|тим|bim)(?![\p{L}\d])|информационн\p{L}*\s+моделирован\p{L}*|building information model(?:l?ing)?/giu
export function normalizeSearch(value: string) {
  return value.toLowerCase().replace(/тим[ -]лид/gu,'team lead').replace(bimAlias, 'bim').trim()
}

export function detectDomain(title: string, _description = '', tags: string[] = []): Domain {
  const specificTags = tags.filter((tag) => !/^(full-stack|front-end|back-end)\s+programming$/i.test(tag))
  const text = `${title} ${specificTags.join(' ')}`
  const nonTechnical = /\b(sales|marketing|business\s+development|go\s+to\s+market|security\s+officer|account\s+executive|customer\s+success|support\s+specialist|recruiter|recruiting|human\s+resources|people\s+operations|finance|legal|counsel|office\s+manager|executive\s+assistant|product\s+support|screenwriter|copywriter|lending\s+manager)\b/i
  const genericRole = /(front-?end|back-?end|full-?stack)/i.test(title) && !/developer|engineer|programmer|разработчик|программист|инженер/i.test(title)
  if (nonTechnical.test(title) || genericRole) return 'other'
  if (/\b(civil|structural|mechanical|electrical|bridge|infrastructure)\s+(design\s+)?engineer|\barchitect(?:ural)?\b(?!.*(?:data|cloud|software|systems?))|проектировщик|архитектор|инженер.проектировщик|\bBIM\b/i.test(title) && !/software|cloud|data|solution|enterprise|security|IT architect/i.test(title)) return 'bim'
  if (/информационн[а-яё]* моделирован|инженер[\s-]*(?:конструктор|пто|сметчик)|сметчик|градостроител|конструктор|геодезист|техническ[а-яё]* надзор|строительн[а-яё]* контрол|\b(?:geotechnical|transportation|environmental|water|project|design|drainage|highway|traffic|construction) engineer|\b(?:quantity surveyor|design manager|civil designer)\b/iu.test(text)) return 'bim'
  if (/аналитик|информационн[а-яё]* безопасност|системн[а-яё]* администратор|сетевой инженер|бэкенд|фронтенд|бекенд|инженер.{0,12}данных|автоматизаци[а-яё]* тестирован|^инженер-программист/iu.test(title)) return 'it'
  if (bimPattern.test(text)) return 'bim'
  if (/дизайнер/i.test(title) || designPattern.test(text)) return 'design'
  if (/data (architect|engineering)|java engineer|разработчик|программист|тестировщик/i.test(title) || itPattern.test(text)) return 'it'
  if (/bim|revit|navisworks|openbim/i.test(normalizeSearch(text + ' ' + _description))) return 'bim'
  return 'other'
}

export function inferWorkFormat(value: unknown, explicit?: unknown): WorkFormat {
  if (typeof explicit === 'string') {
    const normalized = explicit.toLowerCase()
    if (normalized === 'remote') return 'remote'
    if (normalized === 'hybrid') return 'hybrid'
    if (['onsite', 'on-site', 'office'].includes(normalized)) return 'office'
  }
  const text = typeof value === 'string' ? value.toLowerCase() : ''
  if (/hybrid|гибрид/.test(text)) return 'hybrid'
  if (/remote|удал[её]нн|work\s+from\s+home|anywhere|worldwide|distributed/.test(text)) return 'remote'
  if (/on-?site|office|офис/.test(text)) return 'office'
  return 'unspecified'
}

const countries: { pattern: RegExp; code: string; name: string }[] = [
  { pattern: /russia|росси|москва|санкт-петербург|новосибирск|екатеринбург|казань/i, code: 'RU', name: 'Россия' },
  { pattern: /germany|deutschland|berlin|munich|мюнхен|германи/i, code: 'DE', name: 'Германия' },
  { pattern: /united\s+states|\bus(?:a)?\b|u\.s\.|new\s+york|san\s+francisco|austin|seattle|boston/i, code: 'US', name: 'США' },
  { pattern: /united\s+kingdom|uk\b|london|великобритан/i, code: 'GB', name: 'Великобритания' },
  { pattern: /netherlands|amsterdam|нидерланд/i, code: 'NL', name: 'Нидерланды' },
  { pattern: /united\s+arab\s+emirates|uae|dubai|абу-даби|дубай|оаэ/i, code: 'AE', name: 'ОАЭ' },
  { pattern: /serbia|belgrade|белград|серби/i, code: 'RS', name: 'Сербия' },
  { pattern: /canada|toronto|vancouver|канада/i, code: 'CA', name: 'Канада' },
  { pattern: /australia|melbourne|sydney|австрали/i, code: 'AU', name: 'Австралия' },
  { pattern: /poland|warsaw|krakow|польш/i, code: 'PL', name: 'Польша' },
  { pattern: /georgia|tbilisi|грузи|тбилиси/i, code: 'GE', name: 'Грузия' },
  { pattern: /kazakhstan|almaty|astana|казахстан/i, code: 'KZ', name: 'Казахстан' },
  { pattern: /cyprus|limassol|кипр/i, code: 'CY', name: 'Кипр' },
  { pattern: /spain|madrid|barcelona|испани/i, code: 'ES', name: 'Испания' },
  { pattern: /france|paris|франци/i, code: 'FR', name: 'Франция' },
  { pattern: /india|bangalore|инди/i, code: 'IN', name: 'Индия' },
  { pattern: /karachi|pakistan|пакистан/i, code: 'PK', name: 'Пакистан' },
  { pattern: /europe|emea|европ/i, code: 'EU', name: 'Европа' },
  { pattern: /north\s+america/i, code: 'NA', name: 'Северная Америка' },
  { pattern: /apac|singapore/i, code: 'APAC', name: 'Азиатско-Тихоокеанский регион' },
]

export function inferLocation(location: unknown, remote = false) {
  const text = typeof location === 'string' ? location.trim() : ''
  if (/^(?:worldwide|anywhere(?: in the world)?|global|весь\s+мир|из любой страны)$/i.test(text)) {
    return { city: null, country: 'Удалённо / мир', countryCode: 'WW' }
  }
  if (!text || /^(remote|homeoffice|удал[её]нно)$/i.test(text)) return { city: null, country: null, countryCode: null }
  const matches = countries.filter(country => country.pattern.test(text))
  if (matches.length > 1) return { city: null, country: text, countryCode: null }
  const match = matches[0]
  const city = text && !/remote|hybrid|worldwide|anywhere/i.test(text)
    ? text.split(',')[0].replace(/\s+/g, ' ').trim() || null
    : null
  return { city: remote && (match || /only|home.?office/i.test(text)) ? null : city, country: match?.name ?? (remote ? text : null), countryCode: match?.code ?? null }
}

function relevanceScore(vacancy: Vacancy, query: string) {
  if (!query) return 0
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const title = normalizeSearch(vacancy.title)
  const company = vacancy.company.toLowerCase()
  const tags = vacancy.tags.join(' ').toLowerCase()
  const description = vacancy.description.toLowerCase()
  return terms.reduce((score, term) => score + (title.includes(term) ? 8 : 0) + (company.includes(term) ? 4 : 0) + (tags.includes(term) ? 3 : 0) + (description.includes(term) || vacancy.matchedQuery === term ? 1 : 0), 0)
}

export function filterAndSort(vacancies: Vacancy[], filters: SearchFilters) {
  const query = normalizeSearch(filters.q)
  const terms = query.split(/\s+/).filter(Boolean)
  const filtered = vacancies.filter((vacancy) => {
    const currentDomain = vacancy.domain
    if (vacancy.isDemo) return false
    if (filters.withSalary === '1' && !(vacancy.salary.min || vacancy.salary.max || /\d/.test(vacancy.salary.text || ''))) return false
    if (filters.postedWithin === '7' && !(vacancy.publishedAt && Date.parse(vacancy.publishedAt) >= Date.now() - 7 * 86400_000)) return false
    if (filters.domain !== 'all' && currentDomain !== filters.domain) return false
    if (filters.workFormat !== 'all' && vacancy.workFormat !== filters.workFormat) return false
    if (filters.country && filters.country !== 'all') {
      if ((vacancy.countryCode ?? vacancy.country) !== filters.country) return false
    }
    if (filters.city && !matchesCity(vacancy.city, filters.city)) return false
    if (filters.source !== 'all' && vacancy.source !== filters.source && vacancy.id.split(':').slice(0, 2).join(':') !== filters.source) return false
    if (terms.length && vacancy.matchedQuery !== query) {
      const haystack = normalizeSearch(`${vacancy.title} ${vacancy.company} ${vacancy.description} ${vacancy.tags.join(' ')}`)
      if (!terms.every(term => term === 'bim'
        ? /(?:^|[^\p{L}\d])(?:bim|openbim|revit|navisworks|archicad|tekla)(?![\p{L}\d])/iu.test(haystack)
        : haystack.includes(term))) return false
    }
    return true
  })

  return filtered.sort((a, b) => {
    if (filters.sort === 'relevance' && query) {
      const score = relevanceScore(b, query) - relevanceScore(a, query)
      if (score !== 0) return score
      if (a.isTelegram !== b.isTelegram) return Number(a.isTelegram) - Number(b.isTelegram)
    }
    const aDate = a.publishedAt ? Date.parse(a.publishedAt) : 0
    const bDate = b.publishedAt ? Date.parse(b.publishedAt) : 0
    return bDate - aDate || a.title.localeCompare(b.title)
  })
}

export function dedupeVacancies(vacancies: Vacancy[]) {
  const urls = new Set<string>()
  const ids = new Set<string>()
  return vacancies.filter((vacancy) => {
    let parsed: URL
    try { parsed = new URL(vacancy.url) } catch { return false }
    if (!['https:', 'http:'].includes(parsed.protocol) || vacancy.url.replace(/\/$/,'') === vacancy.sourceUrl.replace(/\/$/,'')) return false
    parsed.hash = ''
    for (const key of [...parsed.searchParams.keys()]) if (/^(?:utm_.+|gh_src|trackingId)$/i.test(key)) parsed.searchParams.delete(key)
    parsed.searchParams.sort()
    const canonical = parsed.href.replace(/\/$/,'')
    if (urls.has(canonical) || ids.has(vacancy.id)) return false
    urls.add(canonical)
    ids.add(vacancy.id)
    return true
  })
}

export function errorMessage(error: unknown) {
  if (error instanceof Error) {
    const status = (error as Error & { status?: number }).status
    if (status) return `HTTP ${status}`
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return 'Таймаут источника'
    return error.message.slice(0, 160)
  }
  return 'Неизвестная ошибка источника'
}
