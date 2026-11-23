import type { Vacancy } from '../types'

export interface JobSection { label:string; text:string }
export interface JobDetails {
  description:string; verifiedAt:string; url:string
  sections?:JobSection[]; employment?:string; experience?:string; industry?:string; address?:string; department?:string; pay?:string; skills?:string[]
}
const headings: [RegExp,string][]=[
  [/^(?:основные )?(?:задачи|обязанности|чем предстоит заниматься|что предстоит делать|responsibilities|job description|what you.ll do)$/i,'Обязанности'],
  [/^(?:наши )?(?:требования|что важно|что мы ожидаем|кого мы ищем|qualifications|requirements|what you.ll bring)$/i,'Требования'],
  [/^(?:условия(?: работы)?|мы предлагаем|что мы предлагаем|что у нас есть|benefits|what we offer|additional information)$/i,'Условия'],
  [/^(?:о компании|о нас|company description|about us)$/i,'О компании'],
]
function splitDescription(text:string) {
  const result:JobSection[]=[]
  let label='Описание', lines:string[]=[]
  function flush(){if(lines.some(line=>line.trim()))result.push({label,text:lines.join('\n').trim()});lines=[]}
  for(const line of text.split(/\n/)){
    const cleaned=line.replace(/^[^\p{L}\d]{0,8}/u,'').trim()
    const [head,...tail]=cleaned.split(':')
    const match=headings.find(([pattern])=>pattern.test(head.trim()))
    if(match){flush();label=match[1];if(tail.length)lines.push(tail.join(':').trim())}
    else lines.push(line)
  }
  flush()
  return result
}
const skillList=['Revit','Navisworks','AutoCAD','Civil 3D','BIM 360','ACC','Dynamo','Tekla','ArchiCAD','Renga','Solibri','IFC','MicroStation','OpenRoads','Rhino','Grasshopper','Python','TypeScript','JavaScript','React','SQL','C#','Figma','SketchUp']
export function jobProfile(v:Vacancy, details:JobDetails|null){
  const text = details?.description || v.description || ''
  const sections = details?.sections?.length ? details.sections : splitDescription(text)
  const lines = text.split(/\n|(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean)
  const salaryLine=lines.find(line=>/(?:зарплат[ауы]|оклад|salary range|base salary|pay range)/i.test(line) && /(?:\d[\d\s,.–-]*\s*(?:₽|руб|тыс|usd|eur|gbp)|[$€£]\s?\d)/i.test(line))
  const experience=details?.experience || v.experience || lines.find(line=>line.length<200 && /(?:опыт.{0,23}(?:от\s*)?\d+\s*(?:лет|года?)|\d+[+–-]?\s*(?:years?.{0,16}experience|лет опыта))/i.test(line))
  const employment=details?.employment || v.employment || text.match(/полный рабочий день|частичная занятость|полная занятость|проектная занятость|full[- ]time|part[- ]time/i)?.[0]
  const docs=lines.filter(line=>/visa sponsorship|sponsor.{0,18}visa|work permit|relocation (?:package|support|assistance)|оплат.{0,15}переезд|помощь с переездом|разрешени[ея] на работу/i.test(line)).slice(0,3)
  const skillText=(v.title+' '+text+' '+v.tags.join(' ')).toLowerCase()
  const found=skillList.filter(skill=>{
    const key=skill.toLowerCase()
    let pos=skillText.indexOf(key)
    while(pos>=0){
      if(!/[\p{L}\d]/u.test(skillText[pos-1]||' ')&&!/[\p{L}\d]/u.test(skillText[pos+key.length]||' '))return true
      pos=skillText.indexOf(key,pos+1)
    }
    return false
  })
  const skills=[...new Set([...(details?.skills??[]),...found])].slice(0,16)
  return { sections, skills, salary:v.salary.text || details?.pay || salaryLine, employment, experience, docs }
}
