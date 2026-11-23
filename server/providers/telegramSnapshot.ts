import type { Vacancy } from '../../src/types'
import { emptySalary } from '../../src/types'

const verifiedAt = '2026-11-22T21:00:00.000Z'
const channelUrl = 'https://t.me/s/job_python'

export function telegramSnapshot(): Vacancy[] {
  return [
    {
      id: 'telegram:snapshot:aya-python', externalId: 'snapshot:aya-python', source: 'telegram', sourceName: 'Telegram · Python Job (снимок)', sourceUrl: channelUrl,
      title: 'Python developer', company: 'AYA Group', companyLogo: null,
      description: 'Разработка и развитие асинхронной микросервисной платформы на Python/FastAPI для highload fintech/acquiring. Разработка отказоустойчивой бизнес-логики в распределённой системе: очереди, ретраи, идемпотентность, конкурентный доступ, консистентность данных.\n\nТребуется уверенное владение Python 3.12+, asyncio, SQL, PostgreSQL/MySQL, Redis, FastAPI и Git. Работа удалённо, опыт от 6 лет.',
      city: null, country: null, countryCode: null, workFormat: 'remote', domain: 'it',
      salary: { ...emptySalary, text: 'от 300 000 до 350 000 ₽ за месяц, на руки', min: 300000, max: 350000, currency: 'RUB', period: 'month', taxBasis: 'net' },
      publishedAt: '2026-11-20T12:00:00+03:00', verifiedAt, url: channelUrl, applyUrl: channelUrl,
      tags: ['#senior', '#300k', '#удаленка', 'Python', 'FastAPI'], isDemo: false, isTelegram: true,
    },
    {
      id: 'telegram:snapshot:evrone-fastapi', externalId: 'snapshot:evrone-fastapi', source: 'telegram', sourceName: 'Telegram · Python Job (снимок)', sourceUrl: channelUrl,
      title: 'Middle+/Senior Python Developer (FastAPI)', company: 'evrone.ru', companyLogo: null,
      description: 'Требуется опыт коммерческой разработки на Python от 6 лет, FastAPI и asyncio, SQL и NoSQL, RabbitMQ, Git. Рабочий день на проекте начинается в 8:00 МСК.\n\nЗарплата определяется после технического собеседования. Формат работы удалённый.',
      city: null, country: null, countryCode: null, workFormat: 'remote', domain: 'it',
      salary: { ...emptySalary, text: 'до 300 000 ₽ за месяц, на руки', min: null, max: 300000, currency: 'RUB', period: 'month', taxBasis: 'net' },
      publishedAt: '2026-11-20T12:00:00+03:00', verifiedAt, url: channelUrl, applyUrl: channelUrl,
      tags: ['#senior', '#300k', '#удаленка', 'Python', 'FastAPI'], isDemo: false, isTelegram: true,
    },
    {
      id: 'telegram:snapshot:slsoft-junior', externalId: 'snapshot:slsoft-junior', source: 'telegram', sourceName: 'Telegram · Python Job (снимок)', sourceUrl: channelUrl,
      title: 'Начинающий Python-разработчик', company: 'SL Soft', companyLogo: null,
      description: 'Работа по интеграции и внедрению продукта на серверах клиентов (on-premise), разработка новой функциональности и поддержка продукта. API, Linux, Windows, взаимодействие с ML-инженерами.\n\nПодойдёт хорошая алгоритмическая база, знание Python и командной строки. Опыт работы: 1–3 года. Полная занятость, удалённо.',
      city: null, country: null, countryCode: null, workFormat: 'remote', domain: 'it',
      salary: { ...emptySalary },
      publishedAt: '2026-11-21T12:00:00+03:00', verifiedAt, url: channelUrl, applyUrl: channelUrl,
      tags: ['#junior', '#удаленка', 'Python', 'ML'], isDemo: false, isTelegram: true,
    },
  ]
}
