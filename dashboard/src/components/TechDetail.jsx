import { useMemo } from 'react'

function formatElapsed(months) {
  if (months == null) return ''
  const y = Math.floor(months / 12)
  const m = months % 12
  return `${y}년 ${m}개월`
}

export default function TechDetail({ data, tech, sector, onBack }) {
  const facilityKey = sector.type === 'growth' ? 'growth_facility' : 'strategic_facility'

  const facilities = useMemo(() => {
    return data[facilityKey]
      .filter((r) => r.current && r.status !== '삭제' && (
        r.tech_name === tech.tech_name ||
        (!r.item_no && r.sector_name === tech.sector_name)
      ))
  }, [data, tech, facilityKey])

  return (
    <div className="drill-view">
      <div className="drill-header">
        <button className="back-btn" onClick={onBack}>← {sector.name} 기술 목록</button>
        <div className="drill-title-wrap">
          <span className={`dataset-tag dataset-tag--${sector.type}`}>
            {sector.type === 'growth' ? '신성장·원천' : '국가전략'}
          </span>
          <h2 className="drill-title">{tech.tech_name}</h2>
        </div>
      </div>

      <div className="detail-section">
        <h4 className="detail-heading">기술 설명</h4>
        <p className="detail-body">{tech.tech_description || '(설명 없음)'}</p>
        <div className="detail-meta">
          <span>분야: {tech.sector_name}</span>
          {tech.subsector && <span>소분류: {tech.subsector}</span>}
          <span>
            적용시기: {tech.apply_date?.slice(0, 7)}
            {tech.elapsed_months != null && (
              <span className="elapsed-badge">({formatElapsed(tech.elapsed_months)})</span>
            )}
          </span>
        </div>
      </div>

      <div className="detail-section">
        <h4 className="detail-heading">
          매칭 사업화시설 <span className="detail-count">{facilities.length}건</span>
        </h4>
        {facilities.length === 0 ? (
          <div className="empty-msg small">이 기술에 매칭되는 현행 사업화시설이 없습니다.</div>
        ) : (
          <ul className="facility-list">
            {facilities.map((f, i) => (
              <li key={i} className="facility-item">
                <p className="facility-desc">{f.facility_description}</p>
                <span className="facility-meta">
                  적용시기 {f.apply_date?.slice(0, 7)}
                  {f.elapsed_months != null && (
                    <span className="elapsed-badge">({formatElapsed(f.elapsed_months)})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
