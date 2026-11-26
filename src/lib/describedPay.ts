// Keep the original unit (including a rate per shot or video). Free prose is never a market salary range.
export function describedPay(text: string) {
  const amount = /(?:[$€£]\s*\d|\d[\d \u00a0.,–—-]*(?:₽|руб(?:лей|ля)?\.?|тыс\b|usd\b|eur\b|gbp\b|[$€£]))/i
  for (const raw of text.split('\n')) {
    const line = raw.replace(/^[^\p{L}\d$€£₽]+/u, '').trim()
    const labelled = line.match(/^(?:зарплата|заработная плата|оклад|оплата(?: труда)?|ставка|salary(?: range)?|base (?:pay|salary)(?: range)?)\s*[:–—-]\s*(.{2,180})$/i)
    if (labelled) return labelled[1]
    if (line.length <= 160 && amount.test(line) &&
        (/^(?:от\s+|до\s+|from\s+)?(?:\d|[$€£])/i.test(line) || /^💰/u.test(raw.trim())) &&
        /(?:за|в)\s+(?:ролик|видео|час|день|смену|месяц|год|проект|кадр|минуту)|\/(?:мес|час|год|ч\b|hr\b|year|month)|per (?:hour|year|month)|annually|monthly|hourly/i.test(line)) return line
  }
  return null
}
