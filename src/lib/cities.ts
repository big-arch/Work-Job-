export const cities = [
  { id: 'munich', name: 'Мюнхен', aliases: ['munich', 'münchen', 'мюнхен'], code: 'DE', country: 'Германия', currency: 'Евро · EUR', zone: 'Europe/Berlin',
    fare: '4,20 €', fareNote: 'Одна поездка по зоне M, обычный взрослый билет MVV.', transport: 'MVV',
    fareUrl: 'https://www.mvv-muenchen.de/fileadmin/mediapool/downloads/tickets/preislisten/2026_A4_quer_MVVtarife_Tickets_Web.pdf',
    housing: 'Mietspiegel München', housingUrl: 'https://stadt.muenchen.de/infos/mietspiegel.html', housingNote: 'Муниципальный калькулятор рассчитывает сопоставимую базовую аренду по параметрам квартиры. Коммунальные расходы считаются отдельно.',
    guide: 'Make it in Germany', guideUrl: 'https://www.make-it-in-germany.com/en/', guideNote: 'Поиск работы, признание квалификации и подготовка к переезду.',
    tip: 'Сверьте адрес офиса с зоной M. Для поездок из пригорода могут понадобиться дополнительные зоны.' },
  { id: 'dubai', name: 'Дубай', aliases: ['dubai', 'дубай'], code: 'AE', country: 'ОАЭ', currency: 'Дирхам · AED', zone: 'Asia/Dubai',
    fare: '3 AED', fareNote: 'Одна зона по карте nol Silver. Разовый красный билет стоит 4 AED.', transport: 'RTA Dubai',
    fareUrl: 'https://rta.ae/wps/portal/rta/ae/public-transport/Nol-Fares?lang=en',
    housing: 'Dubai Land Department', housingUrl: 'https://dubailand.gov.ae/en/eservices/rental-index-overview/rental-index/', housingNote: 'Индекс аренды учитывает район, тип помещения и годовую сумму по договору.',
    guide: 'Правительство ОАЭ', guideUrl: 'https://u.ae/en/information-and-services/jobs', guideNote: 'Официальная информация о работе в частном секторе ОАЭ.',
    tip: 'Уточните адрес объекта у проектной команды и посчитайте зоны на ежедневном маршруте.' },
  { id: 'belgrade', name: 'Белград', aliases: ['belgrade', 'beograd', 'белград', 'београд'], code: 'RS', country: 'Сербия', currency: 'Динар · RSD', zone: 'Europe/Belgrade',
    fare: '0 RSD', fareNote: 'Городской общественный транспорт бесплатен с 1 января 2025 года.', transport: 'Город Белград',
    fareUrl: 'https://www.beograd.rs/lat/zivot-u-beogradu/beogradska-riznica/a110483/Anketa-o-javnom-prevozu.html',
    housing: 'Памятка арендатора', housingUrl: 'https://welcometoserbia.gov.rs/worry-free-housing-your-first-steps', housingNote: 'Государственный гид разбирает поиск квартиры, срок договора и ответственность за содержание жилья.',
    guide: 'Welcome to Serbia', guideUrl: 'https://welcometoserbia.gov.rs/', guideNote: 'Государственный портал о проживании, документах и разрешении на работу.',
    tip: 'Проверьте маршрут от жилья до офиса. Для междугородних поездок действуют отдельные тарифы.' },
]

export function matchesCity(location: string | null, cityId: string) {
  const parts = (location ?? '').toLowerCase().split(/[,;/|()]+/).map(part => part.trim())
  return cities.some(city => city.id === cityId && city.aliases.some(alias => parts.includes(alias)))
}
