import type { Domain, Vacancy } from '../types'

export function creativeText(text: string) {
  return text.toLowerCase().replace(/([23])д/gu, '$1d').replace(/[‐‑–—_-]/g, ' ')
}

const artRole = /\b(?:3d|cgi?|vfx|fx|environment|character|prop|lighting|texture|material|vehicle|level|technical|compositing|hard surface|cinematic|layout|surfacing|groom)(?:\s+\w+){0,2}\s+(?:artist|generalist|artiste)\b|\b(?:vfx|cg|cgi|cinematics?|hard surface|3d|groom)(?:\s+\w+){0,2}\s+(?:supervisor|lead|director)\b|\bartiste (?:d.effets sp[ée]ciaux|[ée]clairage|de personnages|de textures)|\b(?:animator|artist|artiste|model[el]?er)\s+3d\b|\b(?:3d|cgi|archviz|vfx)\s+(?:design|visuali[sz]|model|sculpt|animat|layout|lighting|render)|\b(?:compositor|rigging artist|character rigger|texture artist)\b|3d.{0,20}(?:худож|дизайн|модел|визуализ|анима|дженералист|график)|(?:худож|модел|визуализ|аниматор|дизайн).{0,18}3d|архвиз|архитектурн[а-яё]* визуализа|визуализатор|художник (?:по )?(?:окружени|персонаж|текстур)|техническ[а-яё]* художни|(?:cg|vfx) (?:художник|супервайзер|дженералист)|композер/u
const animationRole = /\b(?:animator|storyboard(?:er)?|animatic|previz|previs|motion graphics|motion design|rigging artist)|\b(?:gameplay |technical |character |3d |2d )?animation\s+(?:artist|director|lead|designer|supervisor)|\b(?:artiste rigging|character rigger)|\b(?:artist|artiste|designer|concepteur).{0,19}\banimation\b|\banimat(?:eur|rice)(?:[· -]trice)?\s+(?:3d|2d|technique|jouabilit|de personnages)|(?:моуш[еэ]?н|моушн|мульт[и]?пликатор|раскадровщик|риггер|художник.{0,8}аниматор|анимационн[а-яё]* (?:художник|дизайнер)|режисс[её]р анимации)|[23]d.{0,12}аниматор/u
const screen = /blender|spine|after effects|autodesk maya|motionbuilder|toon boom|unreal|геймдев|gamedev|игров(?:ой|ая|ого)|мультфильм|мультипликац|студия анимации|компьютерн[а-яё]* (?:анимаци|график)|\b[23]d\b/u
const unrelated = /детск[а-яё]* (?:праздник|центр|комнат|аниматор|лагер)|аниматор.{0,24}(?:праздник|отел|курорт|гостиниц|досуг|детям|детский|игровой парк)|культорганизатор|(?:hotel|resort|event|kids|children.s|tourist|fitness) animator|\b(?:crane|offshore|construction|industrial) rigger|3d принтер|3d печат|\b(?:programmer|developer|recruiter|sales|account manager|software engineer|civil 3d)\b|программист|разработчик/u

export function creativeDisciplines(title: string, context = '') {
  const name = creativeText(title)
  if (unrelated.test(name)) return { art: false, animation: false }
  const animation = animationRole.test(name) || (/\brigger\b/.test(name) && /animation|vfx|games?|ubisoft|gameloft|rainbow six|character|3d/.test(creativeText(name+' '+context))) || (/аниматор/.test(name) && screen.test(creativeText(context)))
  const art = artRole.test(name) || (animation && /\b3d\b|3dаниматор|риггер|\brigg/.test(name))
  return { art, animation }
}

const disciplines = new WeakMap<Vacancy, ReturnType<typeof creativeDisciplines>>()
export function matchesDomain(job: Vacancy, domain: Domain) {
  if (job.domain === domain) return true
  if (domain !== '3d' && domain !== 'animation') return false
  let known = disciplines.get(job)
  if (!known) {
    known = creativeDisciplines(job.title, job.department || job.tags.join(' '))
    disciplines.set(job, known)
  }
  return domain === '3d' ? known.art : known.animation
}

// An occupational query can span two disciplines. Free-text skill searches stay literal.
export function creativeQuery(value: string): Domain[] {
  const q = creativeText(value).trim().replace(/\s+/g, ' ')
  if (/^(?:3d (?:animator|animation|аниматор|анимация)|(?:аниматор|анимация|animator) 3d)$/.test(q)) return ['3d','animation']
  if (/^(?:3d|3d ?(?:художник|artist)|художник 3d|тр[её]хмерная графика|3d графика)$/.test(q)) return ['3d']
  if (/^(?:анимаци[яию]|аниматор[ыа]?|animators?|animation|motion design(?:er)?|моушн(?: дизайн(?:ер)?)?)$/.test(q)) return ['animation']
  return []
}
