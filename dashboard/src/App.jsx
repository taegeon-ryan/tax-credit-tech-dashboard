import { useState, useMemo } from 'react'
import { useAllData } from './hooks/useAllData'
import SectorCards from './components/SectorCards'
import TechList from './components/TechList'
import TechDetail from './components/TechDetail'
import StatsView from './components/StatsView'
import SearchResults from './components/SearchResults'
import './App.css'

function DatasetToggle({ filter, onChange }) {
  return (
    <div className="dataset-toggle">
      <button
        className={`toggle-btn toggle-btn--strategic${filter === 'strategic' ? ' active' : ''}`}
        onClick={() => onChange('strategic')}
      >국가전략</button>
      <button
        className={`toggle-btn toggle-btn--growth${filter === 'growth' ? ' active' : ''}`}
        onClick={() => onChange('growth')}
      >신성장·원천</button>
    </div>
  )
}

export default function App() {
  const { data, loading } = useAllData()
  const [view, setView] = useState('card')          // 'card' | 'stats'
  const [filter, setFilter] = useState('strategic') // 'strategic' | 'growth'
  const [selectedSector, setSelectedSector] = useState(null)
  const [selectedTech, setSelectedTech] = useState(null)
  const [search, setSearch] = useState('')

  const isSearching = search.trim().length > 0

  const handleSearchSelect = (tech, type) => {
    setSelectedSector({
      key: `${type}::${tech.sector_key}`,
      type,
      name: tech.sector_name,
      sectorKey: tech.sector_key,
      sectorNumber: parseInt(tech.sector_number, 10) || 999,
    })
    setSelectedTech(tech)
    setView('card')
    setSearch('')
  }

  const statusCounts = useMemo(() => {
    if (!data) return null
    const active = (rows) => rows.filter((r) => r.current && r.status !== '삭제')
    return {
      strategicTech: active(data.strategic_tech).length,
      growthTech: active(data.growth_tech).length,
    }
  }, [data])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">조세특례제한법 첨단기술 현황판</h1>
          {statusCounts && (
            <div className="header-stats">
              <div className="hstat">
                <span className="hstat-num hstat-num--strategic">{statusCounts.strategicTech}</span>
                <span className="hstat-label">국가전략기술</span>
              </div>
              <div className="hstat">
                <span className="hstat-num hstat-num--growth">{statusCounts.growthTech}</span>
                <span className="hstat-label">신성장·원천기술</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="search-bar">
        <div className="search-bar-inner">
          <input
            className="global-search"
            type="search"
            placeholder="기술명 또는 기술 설명으로 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isSearching && (
            <button
              className="search-clear"
              onClick={() => setSearch('')}
              aria-label="검색 지우기"
            >×</button>
          )}
        </div>
      </div>

      <nav className="view-bar">
        <div className="view-toggle">
          <button
            className={`view-btn${view === 'card' ? ' active' : ''}`}
            onClick={() => setView('card')}
          >카드뷰</button>
          <button
            className={`view-btn${view === 'stats' ? ' active' : ''}`}
            onClick={() => setView('stats')}
          >통계</button>
        </div>

        {!isSearching && (view === 'stats' || (view === 'card' && !selectedSector)) && (
          <DatasetToggle filter={filter} onChange={setFilter} />
        )}
      </nav>

      <main className="main-content">
        {loading && <div className="loading">데이터 로딩 중…</div>}

        {!loading && isSearching && (
          <SearchResults data={data} query={search} onSelect={handleSearchSelect} />
        )}

        {!loading && !isSearching && view === 'card' && !selectedSector && (
          <SectorCards
            data={data}
            filter={filter}
            onSelect={(s) => { setSelectedSector(s); setSelectedTech(null) }}
          />
        )}

        {!loading && !isSearching && view === 'card' && selectedSector && !selectedTech && (
          <TechList
            data={data}
            sector={selectedSector}
            onBack={() => setSelectedSector(null)}
            onSelect={(t) => setSelectedTech(t)}
          />
        )}

        {!loading && !isSearching && view === 'card' && selectedSector && selectedTech && (
          <TechDetail
            data={data}
            tech={selectedTech}
            sector={selectedSector}
            onBack={() => setSelectedTech(null)}
          />
        )}

        {!loading && !isSearching && view === 'stats' && <StatsView data={data} filter={filter} onFilter={setFilter} />}
      </main>

    </div>
  )
}
