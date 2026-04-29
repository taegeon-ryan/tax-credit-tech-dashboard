import { useMemo } from 'react'

const MAX_RESULTS = 100

function highlight(text, query) {
  if (!text || !query) return text
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const i = lower.indexOf(q)
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark className="search-mark">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

function findMatches(rows, type, q) {
  const out = []
  for (const r of rows) {
    if (!r.current || r.status === '삭제') continue
    const name = (r.tech_name || '').toLowerCase()
    const desc = (r.tech_description || '').toLowerCase()
    const inName = name.includes(q)
    const inDesc = desc.includes(q)
    if (inName || inDesc) {
      out.push({ ...r, _type: type, _matchScore: inName ? 0 : 1 })
    }
  }
  return out
}

export default function SearchResults({ data, query, onSelect }) {
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const matches = [
      ...findMatches(data.strategic_tech, 'strategic', q),
      ...findMatches(data.growth_tech, 'growth', q),
    ]
    matches.sort((a, b) => a._matchScore - b._matchScore)
    return matches
  }, [data, query])

  const displayed = results.slice(0, MAX_RESULTS)

  return (
    <div className="search-results">
      <div className="search-results-header">
        <h3 className="search-results-title">
          <span className="search-results-query">"{query}"</span> 검색 결과
        </h3>
        <span className="search-results-count">{results.length}건</span>
      </div>

      {results.length === 0 ? (
        <div className="empty-msg">일치하는 기술이 없습니다.</div>
      ) : (
        <div className="search-list">
          {displayed.map((r, i) => (
            <button
              key={`${r._type}-${r.index ?? i}`}
              className={`search-item search-item--${r._type}`}
              onClick={() => onSelect(r, r._type)}
            >
              <span className={`dataset-tag dataset-tag--${r._type} search-item-tag`}>
                {r._type === 'growth' ? '신성장' : '전략'}
              </span>
              <div className="search-item-body">
                <div className="search-item-name">{highlight(r.tech_name, query)}</div>
                {r.tech_description && (
                  <div className="search-item-desc">{highlight(r.tech_description, query)}</div>
                )}
                <div className="search-item-meta">
                  {r.sector_name}
                  {r.subsector ? ` · ${r.subsector}` : ''}
                </div>
              </div>
              <span className="search-item-arrow">›</span>
            </button>
          ))}
          {results.length > MAX_RESULTS && (
            <div className="empty-msg small">상위 {MAX_RESULTS}건 표시 (총 {results.length}건)</div>
          )}
        </div>
      )}
    </div>
  )
}
