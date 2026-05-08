import { useMemo, useState } from 'react'
import { diffWords } from 'diff'
import { historyKey, normalizeSector } from '../hooks/useAllData'

function formatElapsed(months) {
  if (months == null) return ''
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m}개월`
  if (m === 0) return `${y}년`
  return `${y}년 ${m}개월`
}

function formatMonth(date) {
  return date ? date.slice(0, 7) : '적용시기 미상'
}

function formatVersion(version) {
  const v = String(version || '')
  if (!/^\d{6}$/.test(v)) return v ? `${v} 개정` : '개정일 미상'

  const year = 2000 + Number(v.slice(0, 2))
  const month = Number(v.slice(2, 4))
  const day = Number(v.slice(4, 6))
  return `${year}. ${month}. ${day}. 개정`
}

function statusLabel(status) {
  if (status === '삭제') return '폐지'
  return status || '상태 미상'
}

function statusClass(status) {
  if (status === '신설') return 'history-status--new'
  if (status === '변경') return 'history-status--changed'
  if (status === '삭제') return 'history-status--deleted'
  return ''
}

function hasDiff(parts) {
  return parts.some((part) => part.added || part.removed)
}

function diffStats(parts) {
  return parts.reduce(
    (acc, part) => {
      const length = part.value.trim().length
      if (part.added) acc.added += length
      else if (part.removed) acc.removed += length
      else acc.same += length
      return acc
    },
    { added: 0, removed: 0, same: 0 }
  )
}

function isMajorRewrite(parts) {
  const { added, removed, same } = diffStats(parts)
  const total = added + removed + same
  if (total === 0) return false

  const changedRatio = (added + removed) / total
  const unchangedRatio = same / total
  return added >= 30 && removed >= 30 && changedRatio >= 0.5 && unchangedRatio <= 0.45
}

function trimRepeatedDeletion(rows) {
  const firstDeletedIndex = rows.findIndex((row) => row.status === '삭제')
  return firstDeletedIndex === -1 ? rows : rows.slice(0, firstDeletedIndex + 1)
}

function sameNormalized(a, b) {
  return normalizeSector(a || '') === normalizeSector(b || '')
}

function isCommonFacility(row) {
  return !row.item_no && (!row.tech_name || row.tech_name.includes('공통'))
}

function matchesFacility(row, tech) {
  const sameSector = row.sector_key === tech.sector_key
  const sameSubsector = sameNormalized(row.subsector, tech.subsector)
  const hasSubsectorScope = Boolean(row.subsector || tech.subsector)
  const sameNumberedItem = hasSubsectorScope && row.item_no && row.item_no === tech.item_no && sameSector && sameSubsector
  const sameNamedTech = sameNormalized(row.tech_name, tech.tech_name) && sameSector && sameSubsector
  const commonFacility = isCommonFacility(row) && sameSector

  return sameNumberedItem || sameNamedTech || commonFacility
}

function facilityHistoryGroupKey(row) {
  if (isCommonFacility(row)) {
    return [
      'common',
      row.sector_key,
      normalizeSector(row.tech_name || row.facility_description || ''),
    ].join('::')
  }

  return `facility::${historyKey(row)}`
}

function buildFacilityHistoryEntries(rows) {
  return rows.map((row, index) => {
    const previous = rows[index - 1]
    if (!previous) {
      return {
        row,
        isFirst: true,
        descChanged: false,
        statusChanged: false,
      }
    }

    const descDiff = diffWords(previous.facility_description || '', row.facility_description || '')

    return {
      row,
      previous,
      isFirst: false,
      descDiff,
      descChanged: hasDiff(descDiff),
      descRewrite: isMajorRewrite(descDiff),
      statusChanged: previous.status !== row.status,
    }
  })
}

function DiffDisplay({ parts, className = 'diff-text' }) {
  return (
    <p className={className}>
      {parts.map((part, index) => {
        const className = part.added ? 'diff-add' : part.removed ? 'diff-remove' : undefined
        return (
          <span key={`${part.value}-${index}`} className={className}>
            {part.value}
          </span>
        )
      })}
    </p>
  )
}

export default function TechDetail({ data, tech, sector, onBack }) {
  const facilityKey = sector.type === 'growth' ? 'growth_facility' : 'strategic_facility'
  const techKey = sector.type === 'growth' ? 'growth_tech' : 'strategic_tech'
  const [techHistoryOpen, setTechHistoryOpen] = useState(true)
  const [facilityHistoryOpen, setFacilityHistoryOpen] = useState(true)
  const techApplyDate = tech.first_apply_date || tech.apply_date
  const techElapsedMonths = tech.introduced_elapsed_months ?? tech.elapsed_months

  const historyRows = useMemo(() => {
    const key = historyKey(tech)
    const rows = data[techKey]
      .filter((row) => historyKey(row) === key)
      .sort((a, b) => String(a.version).localeCompare(String(b.version)))

    return trimRepeatedDeletion(rows)
  }, [data, tech, techKey])

  const facilities = useMemo(() => {
    return data[facilityKey]
      .filter((r) => r.current && r.status !== '삭제' && matchesFacility(r, tech))
  }, [data, tech, facilityKey])

  const facilityHistoryGroups = useMemo(() => {
    const groups = new Map()
    const facilityRows = data[facilityKey]
      .filter((row) => historyRows.some((techRow) => matchesFacility(row, techRow)))
      .sort((a, b) => String(a.version).localeCompare(String(b.version)))

    for (const row of facilityRows) {
      const key = facilityHistoryGroupKey(row)
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title: row.tech_name || '공통 사업화시설',
          rows: [],
        })
      }

      groups.get(key).rows.push(row)
    }

    return Array.from(groups.values())
      .map((group) => {
        const rows = trimRepeatedDeletion(group.rows)
        const latest = rows[rows.length - 1]
        return {
          ...group,
          title: latest?.tech_name || group.title,
          rows,
          entries: buildFacilityHistoryEntries(rows).reverse(),
        }
      })
      .filter((group) => group.rows.length > 0)
  }, [data, facilityKey, historyRows])

  const historyEntries = useMemo(() => {
    return historyRows.map((row, index) => {
      const previous = historyRows[index - 1]
      if (!previous) {
        return {
          row,
          isFirst: true,
          nameChanged: false,
          descChanged: false,
          statusChanged: false,
        }
      }

      const nameDiff = diffWords(previous.tech_name || '', row.tech_name || '')
      const descDiff = diffWords(previous.tech_description || '', row.tech_description || '')

      return {
        row,
        previous,
        isFirst: false,
        nameDiff,
        descDiff,
        nameChanged: hasDiff(nameDiff),
        descChanged: hasDiff(descDiff),
        descRewrite: isMajorRewrite(descDiff),
        statusChanged: previous.status !== row.status,
      }
    }).reverse()
  }, [historyRows])

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
        <h4 className="detail-heading">기술</h4>
        <div className="detail-body">
          <p className="detail-body-text">{tech.tech_description || '(설명 없음)'}</p>
          <span className="detail-body-meta">
            적용시기 {techApplyDate?.slice(0, 7)}
            {techElapsedMonths != null && (
              <span className="elapsed-badge">({formatElapsed(techElapsedMonths)})</span>
            )}
          </span>
        </div>
        <div className="history-heading-row">
          <button
            className="history-toggle"
            type="button"
            aria-expanded={techHistoryOpen}
            onClick={() => setTechHistoryOpen((open) => !open)}
          >
            <span className={`history-chevron ${techHistoryOpen ? 'is-open' : ''}`}>›</span>
            <span>기술 변경 연혁</span>
            <span className="detail-count">{historyRows.length}건</span>
          </button>
        </div>

        {techHistoryOpen && (
          <div className="toggle-section-body">
            <div className="history-timeline">
              {historyEntries.map((entry, index) => {
                const { row } = entry
                const noContentChange = !entry.isFirst && !entry.nameChanged && !entry.descChanged && !entry.statusChanged

                return (
                  <article key={`${row.version}-${row.apply_date}-${index}`} className="history-entry">
                    <div className="history-marker" aria-hidden="true">
                      <span className="history-dot" />
                      {index < historyEntries.length - 1 && <span className="history-line" />}
                    </div>
                    <div className="history-content">
                      <div className="history-meta">
                        <span className="history-date">{formatMonth(row.apply_date)}</span>
                        <span className={`history-status ${statusClass(row.status)}`}>{statusLabel(row.status)}</span>
                        {!entry.isFirst && entry.descRewrite && (
                          <span className="history-status history-status--rewrite">전면개정</span>
                        )}
                        <span className="history-version">{formatVersion(row.version)}</span>
                      </div>

                      {row.status === '삭제' ? null : entry.isFirst ? (
                        <div className="history-block">
                          <p className="history-tech-name">{row.tech_name}</p>
                          <p className="history-description">{row.tech_description || '(설명 없음)'}</p>
                        </div>
                      ) : (
                        <div className="history-block">
                          {entry.nameChanged ? (
                            <DiffDisplay parts={entry.nameDiff} className="history-tech-name" />
                          ) : (
                            <p className="history-tech-name">{row.tech_name}</p>
                          )}
                          {entry.descChanged && (
                            entry.descRewrite
                              ? <p className="history-description">{row.tech_description || '(설명 없음)'}</p>
                              : <DiffDisplay parts={entry.descDiff} />
                          )}
                          {noContentChange && (
                            <p className="history-empty">내용 변경 없음</p>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="detail-section">
        <h4 className="detail-heading">
          사업화 시설 <span className="detail-count">{facilities.length}건</span>
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

        {facilityHistoryGroups.length > 0 && (
          <div className="facility-history">
            <div className="history-heading-row">
              <button
                className="history-toggle"
                type="button"
                aria-expanded={facilityHistoryOpen}
                onClick={() => setFacilityHistoryOpen((open) => !open)}
              >
                <span className={`history-chevron ${facilityHistoryOpen ? 'is-open' : ''}`}>›</span>
                <span>사업화시설 변경 연혁</span>
                <span className="detail-count">
                  {facilityHistoryGroups.reduce((sum, group) => sum + group.rows.length, 0)}건
                </span>
              </button>
            </div>

            {facilityHistoryOpen && (
              <div className="facility-history-groups">
                {facilityHistoryGroups.map((group) => (
                  <section key={group.key} className="facility-history-group">
                    <div className="history-timeline">
                      {group.entries.map((entry, index) => {
                        const { row } = entry
                        const noContentChange = !entry.isFirst && !entry.descChanged && !entry.statusChanged

                        return (
                          <article key={`${row.version}-${row.apply_date}-${index}`} className="history-entry">
                            <div className="history-marker" aria-hidden="true">
                              <span className="history-dot" />
                              {index < group.entries.length - 1 && <span className="history-line" />}
                            </div>
                            <div className="history-content">
                              <div className="history-meta">
                                <span className="history-date">{formatMonth(row.apply_date)}</span>
                                <span className={`history-status ${statusClass(row.status)}`}>{statusLabel(row.status)}</span>
                                {!entry.isFirst && entry.descRewrite && (
                                  <span className="history-status history-status--rewrite">전면개정</span>
                                )}
                                <span className="history-version">{formatVersion(row.version)}</span>
                              </div>

                              {row.status === '삭제' ? null : entry.isFirst ? (
                                <div className="history-block">
                                  <p className="history-description">{row.facility_description || '(시설 설명 없음)'}</p>
                                </div>
                              ) : (
                                <div className="history-block">
                                  {entry.descChanged && (
                                    entry.descRewrite
                                      ? <p className="history-description">{row.facility_description || '(시설 설명 없음)'}</p>
                                      : <DiffDisplay parts={entry.descDiff} />
                                  )}
                                  {noContentChange && (
                                    <p className="history-empty">내용 변경 없음</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
