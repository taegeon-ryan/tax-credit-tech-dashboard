import { useState, useEffect } from 'react'
import Papa from 'papaparse'

const FILES = {
  growth_tech: '/data/newgrowth_tech.csv',
  growth_facility: '/data/newgrowth_facility.csv',
  strategic_tech: '/data/strategic_tech.csv',
  strategic_facility: '/data/strategic_facility.csv',
}

function computeElapsedMonths(applyDate) {
  if (!applyDate) return null
  const d = new Date(applyDate)
  const now = new Date()
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
}

function historyKey(row) {
  return [
    row.sector_key,
    row.subsector || '',
    row.item_no || row.tech_name,
  ].join('::')
}

function enrichTechHistory(rows) {
  const firstActiveDate = new Map()
  const firstAnyDate = new Map()

  for (const row of rows) {
    if (!row.apply_date) continue
    const key = historyKey(row)

    if (!firstAnyDate.has(key) || row.apply_date < firstAnyDate.get(key)) {
      firstAnyDate.set(key, row.apply_date)
    }

    if (row.status !== '삭제' && (!firstActiveDate.has(key) || row.apply_date < firstActiveDate.get(key))) {
      firstActiveDate.set(key, row.apply_date)
    }
  }

  return rows.map((row) => {
    const firstApplyDate = firstActiveDate.get(historyKey(row)) || firstAnyDate.get(historyKey(row)) || ''
    return {
      ...row,
      first_apply_date: firstApplyDate,
      first_year: firstApplyDate ? firstApplyDate.slice(0, 4) : '',
      introduced_elapsed_months: computeElapsedMonths(firstApplyDate),
    }
  })
}

function normalize(row) {
  const ad = row.apply_date ? String(row.apply_date) : ''
  return {
    ...row,
    current: row.current === 'True',
    apply_date: ad,
    elapsed_months: computeElapsedMonths(ad),
    year: ad ? ad.slice(0, 4) : '',
    sector_key: normalizeSector(row.sector_name),
  }
}

export function normalizeSector(name) {
  if (!name) return ''
  return name
    .replace(/[ㆍ‧·․∙•]/g, '·')
    .replace(/\s+/g, '')
    .trim()
}

function loadCsv(url) {
  return new Promise((resolve) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (r) => resolve(r.data.map(normalize)),
    })
  })
}

export function useAllData() {
  const [data, setData] = useState(null)

  useEffect(() => {
    Promise.all(Object.values(FILES).map(loadCsv)).then(([gt, gf, st, sf]) => {
      setData({
        growth_tech: enrichTechHistory(gt),
        growth_facility: gf,
        strategic_tech: enrichTechHistory(st),
        strategic_facility: sf,
      })
    })
  }, [])

  return { data, loading: !data }
}
