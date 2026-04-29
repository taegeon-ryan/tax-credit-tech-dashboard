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
    // 같은 prefix(가./나./...)는 한 그룹으로 합치고, 가장 최신 apply_date의 표기를 대표 이름으로 사용
    const map = new Map()
    for (const t of techs) {
      const sub = t.subsector || ''
      const prefix = (sub.match(/^([가-힣])\./) || [, sub])[1]
      const date = t.apply_date || ''
      if (!map.has(prefix)) {
        map.set(prefix, { label: sub, labelDate: date, items: [t] })
      } else {
        const g = map.get(prefix)
        g.items.push(t)
        if (date > g.labelDate) { g.label = sub; g.labelDate = date }
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'ko'))
      .map(([, g]) => [g.label, g.items])
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
