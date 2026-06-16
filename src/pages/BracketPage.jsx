import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import GroupBox from '../components/GroupBox'

const STANDINGS_URL = 'https://site.web.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026'
const LEFT_GROUPS = ['Group A','Group B','Group C','Group D','Group E','Group F']
const RIGHT_GROUPS = ['Group G','Group H','Group I','Group J','Group K','Group L']

const LEFT_R32  = [
  { id: '760491', label: '1A vs 3rd' }, { id: '760486', label: '2A vs 2B' },
  { id: '760487', label: '1C vs 2F' }, { id: '760489', label: '1E vs 3rd' },
  { id: '760488', label: '1F vs 2C' }, { id: '760490', label: '2E vs 2I' },
  { id: '760498', label: '1B vs 3rd' }, { id: '760494', label: '1D vs 3rd' },
]
const RIGHT_R32 = [
  { id: '760493', label: '1G vs 3rd' }, { id: '760497', label: '1H vs 2J' },
  { id: '760500', label: '1J vs 2H' }, { id: '760495', label: '1L vs 3rd' },
  { id: '760492', label: '1I vs 3rd' }, { id: '760499', label: '2D vs 2G' },
  { id: '760496', label: '2K vs 2L' }, { id: '760501', label: '1K vs 3rd' },
]
const LEFT_R16  = [
  { id: '760502', label: 'R32 1 vs R32 3' }, { id: '760503', label: 'R32 2 vs R32 5' },
  { id: '760504', label: 'R32 4 vs R32 6' }, { id: '760505', label: 'R32 7 vs R32 8' },
]
const RIGHT_R16 = [
  { id: '760506', label: 'R32 11 vs R32 12' }, { id: '760507', label: 'R32 9 vs R32 10' },
  { id: '760508', label: 'R32 13 vs R32 15' }, { id: '760509', label: 'R32 14 vs R32 16' },
]
const LEFT_QF  = [{ id: '760510', label: 'R16 1 vs R16 2' }, { id: '760512', label: 'R16 3 vs R16 4' }]
const RIGHT_QF = [{ id: '760511', label: 'R16 5 vs R16 6' }, { id: '760513', label: 'R16 7 vs R16 8' }]
const LEFT_SF  = [{ id: '760514', label: 'QF 1 vs QF 2' }]
const RIGHT_SF = [{ id: '760515', label: 'QF 3 vs QF 4' }]
const FINAL    = [{ id: '760517', label: 'SF 1 vs SF 2' }]
const TOTAL_HEIGHT = 900

function MatchSlot({ match, onClick, size = 'sm' }) {
  const w = size === 'sm' ? 130 : size === 'md' ? 140 : 155
  return (
    <div
      onClick={() => onClick(match.id)}
      className="rounded-lg overflow-hidden border border-white/20 hover:border-green-400/60 cursor-pointer transition flex-shrink-0"
      style={{ background: 'rgba(15,15,35,0.9)', width: w }}
    >
      <div className="px-2 py-1 border-b border-white/10 text-center">
        <span className="text-gray-500" style={{ fontSize: 9 }}>{match.label}</span>
      </div>
      <div className="px-2 py-1.5 border-b border-white/10">
        <span className="text-white" style={{ fontSize: 10 }}>TBD</span>
      </div>
      <div className="px-2 py-1.5">
        <span className="text-white" style={{ fontSize: 10 }}>TBD</span>
      </div>
    </div>
  )
}

function Column({ title, matches, onClick, size }) {
  const w = size === 'sm' ? 145 : 160
  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: w, height: TOTAL_HEIGHT }}>
      <p className="text-gray-400 tracking-widest uppercase text-center mb-3 flex-shrink-0"
        style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 13 }}>
        {title}
      </p>
      <div className="flex flex-col flex-1 justify-around">
        {matches.map(m => (
          <div key={m.id} className="flex justify-center">
            <MatchSlot match={m} onClick={onClick} size={size} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BracketPage() {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(0.8)
  const outerRef = useRef(null)
  const innerRef = useRef(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const scrollLeftRef = useRef(0)
  const scrollTopRef = useRef(0)

  useEffect(() => {
    async function loadStandings() {
      try {
        const res = await fetch(STANDINGS_URL)
        const data = await res.json()
        const parsed = (data.children || []).map(group => ({
          name: group.name,
          entries: (group.standings.entries || []).map(e => ({
            team: e.team,
            rank: e.stats.find(s => s.name === 'rank')?.value || 0,
            pts: e.stats.find(s => s.name === 'points')?.displayValue || '0',
            gp: e.stats.find(s => s.name === 'gamesPlayed')?.displayValue || '0',
            w: e.stats.find(s => s.name === 'wins')?.displayValue || '0',
            d: e.stats.find(s => s.name === 'ties')?.displayValue || '0',
            l: e.stats.find(s => s.name === 'losses')?.displayValue || '0',
            gd: e.stats.find(s => s.name === 'pointDifferential')?.displayValue || '0',
            note: e.note,
          })).sort((a, b) => a.rank - b.rank)
        }))
        setGroups(parsed)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    loadStandings()
  }, [])

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        const outer = outerRef.current
        const inner = innerRef.current
        if (!outer || !inner) return
        if (inner.scrollWidth > outer.clientWidth) {
          outer.scrollLeft = (inner.scrollWidth - outer.clientWidth) / 2
        }
      }, 200)
    }
  }, [loading, zoom])

  const leftGroups  = groups.filter(g => LEFT_GROUPS.includes(g.name))
  const rightGroups = groups.filter(g => RIGHT_GROUPS.includes(g.name))
  const goMatch = (id) => navigate(`/match/${id}`)

  const onMouseDown = (e) => {
    isDragging.current = true
    startX.current = e.pageX - outerRef.current.offsetLeft
    startY.current = e.pageY - outerRef.current.offsetTop
    scrollLeftRef.current = outerRef.current.scrollLeft
    scrollTopRef.current = outerRef.current.scrollTop
    outerRef.current.style.cursor = 'grabbing'
  }
  const onMouseMove = (e) => {
    if (!isDragging.current) return
    e.preventDefault()
    const x = e.pageX - outerRef.current.offsetLeft
    const y = e.pageY - outerRef.current.offsetTop
    outerRef.current.scrollLeft = scrollLeftRef.current - (x - startX.current)
    outerRef.current.scrollTop = scrollTopRef.current - (y - startY.current)
  }
  const onMouseUp = () => {
    isDragging.current = false
    if (outerRef.current) outerRef.current.style.cursor = 'grab'
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundImage: 'url(/grass_bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="min-h-screen bg-black/80 p-4">

        <div className="flex items-center justify-between mb-4 sticky top-0 z-10 bg-black/60 px-4 py-2 rounded-xl backdrop-blur">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white text-sm transition">
            Back
          </button>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, letterSpacing: '0.05em' }}>
            2026 World Cup Bracket
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/model')}
              className="px-3 py-1 rounded-lg bg-green-900/50 hover:bg-green-800/50 text-green-300 text-sm border border-green-700/50"
            >
              Model Logic
            </button>
            <button onClick={() => setZoom(z => Math.max(0.3, +(z-0.1).toFixed(1)))}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sm">-</button>
            <span className="text-sm text-gray-400 w-10 text-center">{Math.round(zoom*100)}%</span>
            <button onClick={() => setZoom(z => Math.min(1.5, +(z+0.1).toFixed(1)))}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sm">+</button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-xl animate-pulse">Loading bracket...</p>
          </div>
        ) : (
          <div
            ref={outerRef}
            style={{
              overflowX: 'auto',
              overflowY: 'auto',
              cursor: 'grab',
              WebkitOverflowScrolling: 'touch',
              display: 'flex',
              justifyContent: 'center',
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <div
              ref={innerRef}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease',
                display: 'inline-flex',
                minWidth: 'max-content',
              }}
            >
              <div className="flex items-center justify-center gap-3">

                <div className="flex flex-col justify-around flex-shrink-0" style={{ height: TOTAL_HEIGHT }}>
                  <p className="text-gray-400 tracking-widest uppercase text-center mb-3"
                    style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 13 }}>Groups</p>
                  <div className="flex flex-col justify-around flex-1">
                    {leftGroups.map((g, i) => <GroupBox key={i} group={g} />)}
                  </div>
                </div>

                <Column title="R32" matches={LEFT_R32}  onClick={goMatch} size="sm" />
                <Column title="R16" matches={LEFT_R16}  onClick={goMatch} size="sm" />
                <Column title="QF"  matches={LEFT_QF}   onClick={goMatch} size="md" />
                <Column title="SF"  matches={LEFT_SF}   onClick={goMatch} size="md" />

                <div className="flex flex-col items-center justify-center flex-shrink-0 px-4 gap-3"
                  style={{ height: TOTAL_HEIGHT }}>
                  <p className="text-yellow-400 text-center"
                    style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, letterSpacing: '0.1em' }}>
                    World Cup Final
                  </p>
                  <MatchSlot match={FINAL[0]} onClick={goMatch} size="lg" />
                  <img src="/trophy.png" className="w-32 h-auto opacity-90" alt="Trophy" />
                  <p className="text-gray-400 text-xs text-center">Jul 19 · MetLife Stadium</p>
                </div>

                <Column title="SF"  matches={RIGHT_SF}  onClick={goMatch} size="md" />
                <Column title="QF"  matches={RIGHT_QF}  onClick={goMatch} size="md" />
                <Column title="R16" matches={RIGHT_R16} onClick={goMatch} size="sm" />
                <Column title="R32" matches={RIGHT_R32} onClick={goMatch} size="sm" />

                <div className="flex flex-col justify-around flex-shrink-0" style={{ height: TOTAL_HEIGHT }}>
                  <p className="text-gray-400 tracking-widest uppercase text-center mb-3"
                    style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 13 }}>Groups</p>
                  <div className="flex flex-col justify-around flex-1">
                    {rightGroups.map((g, i) => <GroupBox key={i} group={g} />)}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
