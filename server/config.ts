import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const envFile = resolve('.env')
if (existsSync(envFile)) process.loadEnvFile(envFile)

function listEnv(name: string, fallback: string[]) {
  const value = process.env[name]
  if (value === undefined) return fallback
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

export const appConfig = {
  superJobKey: process.env.SUPERJOB_APP_KEY?.trim() ?? '',
  hhAccessToken: process.env.HH_ACCESS_TOKEN?.trim() ?? '',
  hhUserAgent: process.env.HH_USER_AGENT?.trim() || 'WorkJob/0.1 (local development; vacancy aggregator)',
  greenhouseBoards: listEnv('GREENHOUSE_BOARDS', ['discord']),
  ashbyBoards: listEnv('ASHBY_BOARDS', ['linear', 'notion', 'ramp']),
  leverBoards: listEnv('LEVER_BOARDS', []).filter(board => board.toLowerCase() !== 'leverdemo'),
  telegramGroups: listEnv('TELEGRAM_GROUPS', ['bimwork', 'bim_tim_work', 'architect_vacancies', 'arkhitektory_chat', 'vacancii_construction', 'architectsandconstructors', 'job_in_project']).map(name => name.toLowerCase()).filter(name => /^[a-z0-9_]{4,32}$/.test(name)),
  telegramChannels: listEnv('TELEGRAM_CHANNELS', ['bimvac', 'wasa_job', 'archhunterchannel', 'archhireglobal', 'haltura_arhitetura', 'job_python', 'remoteit', 'jobjava', 'cgfreelance', 'gamedevjob', 'gamedevjobs']).map(name => name.toLowerCase())
    .filter((channel) => /^[a-zA-Z0-9_]+$/.test(channel)),
}
