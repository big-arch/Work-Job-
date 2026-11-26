const DEFAULT_HEADERS = {
  Accept: 'application/json, text/html;q=0.9, */*;q=0.8',
  'User-Agent': 'WorkJob/0.1 (local development; vacancy aggregator)',
}

export async function fetchText(url: string, headers: Record<string, string> = {}, timeoutMs = 20_000) {
  const response = await fetch(url, {
    headers: !('document' in globalThis) ? { ...DEFAULT_HEADERS, ...headers } : { Accept: DEFAULT_HEADERS.Accept, ...headers },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
  })
  const text = await response.text()
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${text.slice(0, 120).replace(/\s+/g, ' ')}`) as Error & { status?: number }
    error.status = response.status
    throw error
  }
  return text
}

export async function fetchJson<T>(url: string, headers: Record<string, string> = {}, timeoutMs = 12_000): Promise<T> {
  const text = await fetchText(url, headers, timeoutMs)
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('Источник вернул некорректный JSON')
  }
}

export function plainText(value: unknown, maxLength = 14_000) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6]|section|article)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&laquo;/gi, '«')
    .replace(/&raquo;/gi, '»')
    .replace(/&#(\d{1,7});/g, (entity, digits: string) => {
      const value = Number(digits)
      return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : entity
    })
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
}

export function safeUrl(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : fallback
  } catch {
    return fallback
  }
}
