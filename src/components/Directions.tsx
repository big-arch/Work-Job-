import { Boxes, Clapperboard, Code2, DraftingCompass, LayoutGrid, Palette } from 'lucide-react'
import type { SearchFilters, VacancyResponse } from '../types'
import { domainLabels } from '../lib/utils'

const directions = [
  { id: 'all', icon: LayoutGrid }, { id: 'bim', icon: DraftingCompass }, { id: 'it', icon: Code2 },
  { id: 'design', icon: Palette }, { id: '3d', icon: Boxes }, { id: 'animation', icon: Clapperboard },
] as const
export function Directions({ filters, facets, onChange }: {
  filters: SearchFilters; facets?: VacancyResponse['facets']; onChange: (next: SearchFilters) => void
}) {
  const skills = facets?.skills ?? []
  const visible = skills.slice(0,8)
  if (filters.skill && !visible.some(s=>s.name===filters.skill))
    visible.push(skills.find(s=>s.name===filters.skill) || {name:filters.skill,count:0})
  return <div className="direction-picker">
    <div className="catalog-controls" role="group" aria-label="Направление вакансий">
      {directions.map(({id,icon:Icon})=><button key={id} type="button" aria-pressed={filters.domain===id}
        onClick={()=>onChange({...filters,domain:id,skill:''})}><Icon aria-hidden="true"/>
        {id==='all' ? 'Все направления' : id==='it' ? 'IT' : domainLabels[id]}
        {id!=='all' && facets && <small>{(facets.domains.find(d=>d.id===id)?.count ?? 0).toLocaleString('ru-RU')}</small>}
      </button>)}
    </div>
    {visible.length>0 && <div className="tool-filters" role="group" aria-label="Инструменты из объявлений"><b>Инструменты</b>
      {visible.map(({name,count})=><button type="button" key={name} aria-pressed={filters.skill===name}
        onClick={()=>onChange({...filters,skill:filters.skill===name?'':name})}>{name} <small>{count}</small></button>)}
    </div>}
  </div>
}
