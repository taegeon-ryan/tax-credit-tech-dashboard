import { useMemo, useState } from 'react'

const AGE_FILTERS = [
  { value: 'all', label: '전체', minMonths: 0 },
  { value: '3y', label: '3년 이상', minMonths: 36 },
  { value: '5y', label: '5년 이상', minMonths: 60 },
]

const SORT_OPTIONS = [
  { value: 'statute', label: '별표 순' },
  { value: 'introduced', label: '도입일 순' },
  { value: 'name', label: '가나다 순' },
]

function compareStatuteOrder(a, b) {
  const sectorDiff = (parseInt(a.sector_number, 10) || 999) - (parseInt(b.sector_number, 10) || 999)
  if (sectorDiff !== 0) return sectorDiff

  const subsectorDiff = (a.subsector || '').localeCompare(b.subsector || '', 'ko', { numeric: true })
  if (subsectorDiff !== 0) return subsectorDiff

  const itemDiff = (a.item_no || '').localeCompare(b.item_no || '', 'ko', { numeric: true })
  if (itemDiff !== 0) return itemDiff

  return (parseInt(a.index, 10) || 0) - (parseInt(b.index, 10) || 0)
}

function compareTechs(sortBy) {
  return (a, b) => {
    if (sortBy === 'name') {
      const nameDiff = a.tech_name.localeCompare(b.tech_name, 'ko', { numeric: true })
      return nameDiff || compareStatuteOrder(a, b)
    }

    if (sortBy === 'introduced') {
      const dateDiff = (a.first_apply_date || '').localeCompare(b.first_apply_date || '')
      return dateDiff || compareStatuteOrder(a, b)
    }

    return compareStatuteOrder(a, b)
  }
}

function ageTag(row) {
  const label = row.first_apply_date ? row.first_apply_date.slice(0, 7) : ''
  if (!label) return null
  if (row.introduced_elapsed_months >= 60) return { label, level: '5y' }
  if (row.introduced_elapsed_months >= 36) return { label, level: '3y' }
  return { label, level: 'recent' }
}

export default function TechList({ data, sector, onBack, onSelect }) {
  const [ageFilter, setAgeFilter] = useState('all')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [sortBy, setSortBy] = useState('statute')
  const key = sector.type === 'growth' ? 'growth_tech' : 'strategic_tech'
  const rows = data[key]

  const filteredRows = useMemo(() => {
    const targetSectorKey = sector.key.split('::')[1]
    const selectedAge = AGE_FILTERS.find((f) => f.value === ageFilter)
    const minMonths = selectedAge?.minMonths || 0

    return rows
      .filter((r) => r.current && r.sector_key === targetSectorKey)
      .filter((r) => !r.renumbered_deletion)
      .filter((r) => minMonths === 0 || r.introduced_elapsed_months >= minMonths)
  }, [rows, sector, ageFilter])

  const counts = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        if (row.status === '삭제') acc.deleted += 1
        else acc.active += 1
        return acc
      },
      { active: 0, deleted: 0 }
    )
  }, [filteredRows])

  const techs = useMemo(() => {
    return filteredRows
      .filter((r) => includeDeleted || r.status !== '삭제')
      .sort(compareTechs(sortBy))
  }, [filteredRows, includeDeleted, sortBy])

  const groups = useMemo(() => {
    if (sector.type !== 'growth' || sortBy !== 'statute') return null
    // 같은 prefix(가./나./...)는 한 그룹으로 합치고, 가장 최신 apply_date의 표기를 대표 이름으로 사용
    const map = new Map()
    for (const t of techs) {
      const sub = t.subsector || ''
      const match = sub.match(/^([가-힣])\./)
      const prefix = match ? match[1] : sub
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
  }, [techs, sector.type, sortBy])

  const renderTech = (t, i) => {
    const tag = ageTag(t)
    const deleted = t.status === '삭제'

    return (
      <button
        key={`${t.index}-${t.item_no}-${t.tech_name}`}
        className={`tech-item tech-item--${sector.type}${deleted ? ' tech-item--deleted' : ''}`}
        style={{ '--item-delay': `${Math.min(i * 12, 120)}ms` }}
        onClick={() => onSelect(t)}
      >
        <span className="tech-item-index">{i + 1}.</span>
        <span className="tech-item-main">
          <span className="tech-item-name">{t.tech_name}</span>
          <span className="tech-item-badges">
            {tag && <span className={`tech-age-badge tech-age-badge--${tag.level}`}>{tag.label}</span>}
            {deleted && <span className="tech-status-badge">폐지</span>}
          </span>
        </span>
        <span className="tech-item-arrow">›</span>
      </button>
    )
  }

  return (
    <div className="drill-view">
      <div className="drill-header">
        <button className="back-btn" onClick={onBack}>← 분야 목록</button>
        <div className="drill-title-wrap">
          <span className={`dataset-tag dataset-tag--${sector.type}`}>
            {sector.type === 'growth' ? '신성장·원천' : '국가전략'}
          </span>
          <h2 className="drill-title">{sector.name}</h2>
          <span className="drill-count">
            <span>{counts.active}건</span>
            <span className="drill-deleted-count">폐지 {counts.deleted}건</span>
          </span>
        </div>
      </div>

      <div className="tech-controls">
        <div
          className="tech-filter-group"
          aria-label="도입 기간 필터"
          style={{
            '--filter-index': AGE_FILTERS.findIndex((f) => f.value === ageFilter),
            '--filter-color': ageFilter === '3y' ? '#dbeafe' : ageFilter === '5y' ? '#fef3c7' : '#f8fafc',
            '--filter-text': ageFilter === '3y' ? '#1d4ed8' : ageFilter === '5y' ? '#92400e' : 'var(--text)',
          }}
        >
          {AGE_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`tech-filter-btn tech-filter-btn--${f.value}${ageFilter === f.value ? ' active' : ''}`}
              onClick={() => setAgeFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <label className="deleted-toggle">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
          />
          <span className="deleted-toggle-box" aria-hidden="true" />
          <span>폐지 포함</span>
        </label>

        <label className="sort-control">
          <span>정렬</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div key={`${ageFilter}-${includeDeleted}-${sortBy}`} className="tech-list">
        {groups ? (
          groups.map(([subsector, items]) => (
            <div key={subsector} className="subsector-group">
              {subsector && <div className="subsector-heading">{subsector}</div>}
              {items.map(renderTech)}
            </div>
          ))
        ) : (
          techs.map(renderTech)
        )}
        {techs.length === 0 && <div className="empty-msg">해당 조건의 기술이 없습니다.</div>}
      </div>
    </div>
  )
}
