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
        growth_tech: gt,
        growth_facility: gf,
        strategic_tech: st,
        strategic_facility: sf,
      })
    })
  }, [])

  return { data, loading: !data }
}
