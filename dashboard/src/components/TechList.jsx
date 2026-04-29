import { useMemo } from 'react'

export default function TechList({ data, sector, onBack, onSelect }) {
  const key = sector.type === 'growth' ? 'growth_tech' : 'strategic_tech'
  const rows = data[key]

  const techs = useMemo(() => {
    return rows.filter(
      (r) => r.current && r.status !== '삭제' && r.sector_key === sector.key.split('::')[1]
    )
  }, [rows, sector])

  const groups = useMemo(() => {
    if (sector.type !== 'growth') return null
    const map = new Map()
    for (const t of techs) {
      const sub = t.subsector || ''
      if (!map.has(sub)) map.set(sub, [])
      map.get(sub).push(t)
    }
    return Array.from(map.entries())
  }, [techs, sector.type])

  return (
    <div className="drill-view">
      <div className="drill-header">
        <button className="back-btn" onClick={onBack}>← 분야 목록</button>
        <div className="drill-title-wrap">
          <span className={`dataset-tag dataset-tag--${sector.type}`}>
            {sector.type === 'growth' ? '신성장·원천' : '국가전략'}
          </span>
          <h2 className="drill-title">{sector.name}</h2>
          <span className="drill-count">{techs.length}건</span>
        </div>
      </div>

      <div className="tech-list">
        {groups ? (
          groups.map(([subsector, items]) => (
            <div key={subsector} className="subsector-group">
              {subsector && <div className="subsector-heading">{subsector}</div>}
              {items.map((t, i) => (
                <button
                  key={i}
                  className={`tech-item tech-item--${sector.type}`}
                  onClick={() => onSelect(t)}
                >
                  <span className="tech-item-index">{i + 1}.</span>
                  <span className="tech-item-name">{t.tech_name}</span>
                  <span className="tech-item-arrow">›</span>
                </button>
              ))}
            </div>
          ))
        ) : (
          techs.map((t, i) => (
            <button
              key={i}
              className={`tech-item tech-item--${sector.type}`}
              onClick={() => onSelect(t)}
            >
              <span className="tech-item-index">{i + 1}.</span>
              <span className="tech-item-name">{t.tech_name}</span>
              <span className="tech-item-arrow">›</span>
            </button>
          ))
        )}
        {techs.length === 0 && <div className="empty-msg">현행 기술이 없습니다.</div>}
      </div>
    </div>
  )
}
