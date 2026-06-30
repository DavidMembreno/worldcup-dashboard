import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import GroupBox from '../components/GroupBox'

const STANDINGS_URL = 'https://site.web.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026'
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event='
const LEFT_GROUPS = ['Group A','Group B','Group C','Group D','Group E','Group F']
const RIGHT_GROUPS = ['Group G','Group H','Group I','Group J','Group K','Group L']

const LEFT_R32 = [
  { id: '760491', home: 'Mexico', away: 'Ecuador' },
  { id: '760486', home: 'South Africa', away: 'Canada' },
  { id: '760487', home: 'Brazil', away: 'Japan' },
  { id: '760489', home: 'Germany', away: 'Paraguay' },
  { id: '760488', home: 'Netherlands', away: 'Morocco' },
  { id: '760490', home: 'Ivory Coast', away: 'Norway' },
  { id: '760498', home: 'Switzerland', away: 'Algeria' },
  { id: '760494', home: 'United States', away: 'Bosnia and Herzegovina' },
]
const RIGHT_R32 = [
  { id: '760493', home: 'Belgium', away: 'Senegal' },
  { id: '760497', home: 'Spain', away: 'Austria' },
  { id: '760500', home: 'Argentina', away: 'Cape Verde' },
  { id: '760495', home: 'England', away: 'DR Congo' },
  { id: '760492', home: 'France', away: 'Sweden' },
  { id: '760499', home: 'Australia', away: 'Egypt' },
  { id: '760496', home: 'Portugal', away: 'Croatia' },
  { id: '760501', home: 'Colombia', away: 'Ghana' },
]
const LEFT_R16  = [
  { id: '760502', home: 'TBD', away: 'TBD' }, { id: '760503', home: 'TBD', away: 'TBD' },
  { id: '760504', home: 'TBD', away: 'TBD' }, { id: '760505', home: 'TBD', away: 'TBD' },
]
const RIGHT_R16 = [
  { id: '760506', home: 'TBD', away: 'TBD' }, { id: '760507', home: 'TBD', away: 'TBD' },
  { id: '760508', home: 'TBD', away: 'TBD' }, { id: '760509', home: 'TBD', away: 'TBD' },
]
const LEFT_QF  = [{ id: '760510', home: 'TBD', away: 'TBD' }, { id: '760512', home: 'TBD', away: 'TBD' }]
const RIGHT_QF = [{ id: '760511', home: 'TBD', away: 'TBD' }, { id: '760513', home: 'TBD', away: 'TBD' }]
const LEFT_SF  = [{ id: '760514', home: 'TBD', away: 'TBD' }]
const RIGHT_SF = [{ id: '760515', home: 'TBD', away: 'TBD' }]
const FINAL    = [{ id: '760517', home: 'TBD', away: 'TBD' }]
const TOTAL_HEIGHT = 900

const ALL_MATCHES = [
  ...LEFT_R32, ...RIGHT_R32,
  ...LEFT_R16, ...RIGHT_R16,
  ...LEFT_QF, ...RIGHT_QF,
  ...LEFT_SF, ...RIGHT_SF,
  ...FINAL,
]

function MatchSlot({ match, liveData, onClick, size = 'sm' }) {
  const w = size === 'sm' ? 135 : size === 'md' ? 145 : 160
  const live = liveData?.[match.id]
  const finished = live?.finished
  const homeScore = live?.homeScore
  const awayScore = live?.awayScore
  const homeWin = finished && homeScore > awayScore
  const awayWin = finished && awayScore > homeScore
  const homeName = live?.home || match.home || 'TBD'
  const awayName = live?.away || match.away || 'TBD'

  return (
    <div
      onClick={() => onClick(match.id)}
      className="rounded-lg overflow-hidden border cursor-pointer transition flex-shrink-0"
      style={{
        background: 'rgba(15,15,35,0.9)',
        width: w,
        borderColor: finished ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
      }}
    >
      {/* home row */}
      <div
        className="px-2 py-1.5 border-b flex items-center justify-between"
        style={{
          borderColor: 'rgba(255,255,255,0.08)',
          background: homeWin ? 'rgba(10,138,58,0.25)' : 'transparent',
        }}
      >
        <span
          className="truncate"
          style={{
            fontSize: 10,
            color: homeName === 'TBD' ? '#6b7280' : homeWin ? '#7ED957' : awayWin ? '#9ca3af' : 'white',
            fontWeight: homeWin ? 'bold' : 'normal',
          }}
        >
          {homeName}
        </span>
        {finished && (
          <span style={{ fontSize: 11, fontWeight: 'bold', color: homeWin ? '#7ED957' : '#9ca3af', marginLeft: 4 }}>
            {homeScore}
          </span>
        )}
      </div>

      {/* away row */}
      <div
        className="px-2 py-1.5 flex items-center justify-between"
        style={{
          background: awayWin ? 'rgba(10,138,58,0.25)' : 'transparent',
        }}
      >
        <span
          className="truncate"
          style={{
            fontSize: 10,
            color: awayName === 'TBD' ? '#6b7280' : awayWin ? '#7ED957' : homeWin ? '#9ca3af' : 'white',
            fontWeight: awayWin ? 'bold' : 'normal',
          }}
        >
          {awayName}
        </span>
        {finished && (
          <span style={{ fontSize: 11, fontWeight: 'bold', color: awayWin ? '#7ED957' : '#9ca3af', marginLeft: 4 }}>
            {awayScore}
          </span>
        )}
      </div>
    </div>
  )
}

function Column({ title, matches, onClick, size, liveData }) {
  const w = size === 'sm' ? 150 : 165
  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: w, height: TOTAL_HEIGHT }}>
      <p className="text-gray-400 tracking-widest uppercase text-center mb-3 flex-shrink-0"
        style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 13 }}>
        {title}
      </p>
      <div className="flex flex-col flex-1 justify-around">
        {matches.map(m => (
          <div key={m.id} className="flex justify-center">
            {/* home row */}
<div
  className="px-2 py-1.5 border-b flex items-center justify-between gap-1"
  style={{
    borderColor: 'rgba(255,255,255,0.08)',
    background: homeWin ? 'rgba(10,138,58,0.25)' : 'transparent',
  }}
>
  <div className="flex items-center gap-1 min-w-0">
    {live?.homeLogo && (
      <img src={live.homeLogo} className="w-4 h-4 rounded-full object-cover flex-shrink-0"
        onError={e => e.target.style.display='none'} />
    )}
    <span className="truncate" style={{
      fontSize: 10,
      color: homeName === 'TBD' ? '#6b7280' : homeWin ? '#7ED957' : awayWin ? '#9ca3af' : 'white',
      fontWeight: homeWin ? 'bold' : 'normal',
    }}>
      {homeName}
    </span>
  </div>
  {finished && (
    <span style={{ fontSize: 11, fontWeight: 'bold', color: homeWin ? '#7ED957' : '#9ca3af', flexShrink: 0 }}>
      {homeScore}
    </span>
  )}
</div>

{/* away row */}
<div
  className="px-2 py-1.5 flex items-center justify-between gap-1"
  style={{ background: awayWin ? 'rgba(10,138,58,0.25)' : 'transparent' }}
>
  <div className="flex items-center gap-1 min-w-0">
    {live?.awayLogo && (
      <img src={live.awayLogo} className="w-4 h-4 rounded-full object-cover flex-shrink-0"
        onError={e => e.target.style.display='none'} />
    )}
    <span className="truncate" style={{
      fontSize: 10,
      color: awayName === 'TBD' ? '#6b7280' : awayWin ? '#7ED957' : homeWin ? '#9ca3af' : 'white',
      fontWeight: awayWin ? 'bold' : 'normal',
    }}>
      {awayName}
    </span>
  </div>
  {finished && (
    <span style={{ fontSize: 11, fontWeight: 'bold', color: awayWin ? '#7ED957' : '#9ca3af', flexShrink: 0 }}>
      {awayScore}
    </span>
  )}
</div>
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
  const [liveData, setLiveData] = useState({})
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
    async function loadLiveData() {
      const results = {}
      await Promise.all(ALL_MATCHES.map(async (m) => {
        try {
          const res = await fetch(`${ESPN_BASE}${m.id}`)
          const data = await res.json()
          const comp = data?.header?.competitions?.[0]
          if (!comp) return
          const status = comp?.status?.type?.name
          const finished = status === 'STATUS_FULL_TIME' || status === 'STATUS_FINAL_PEN'
          const competitors = comp?.competitors || []
          const home = competitors.find(c => c.homeAway === 'home')
          const away = competitors.find(c => c.homeAway === 'away')
          results[m.id] = {
  finished,
  home: home?.team?.displayName || m.home,
  away: away?.team?.displayName || m.away,
  homeLogo: home?.team?.logos?.[0]?.href || home?.team?.logo || '',
  awayLogo: away?.team?.logos?.[0]?.href || away?.team?.logo || '',
  homeScore: finished ? parseInt(home?.score || 0) : null,
  awayScore: finished ? parseInt(away?.score || 0) : null,
  homeWinner: home?.winner || false,
  awayWinner: away?.winner || false,
}
        } catch {}
      }))
      setLiveData(results)
    }
    loadLiveData()
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

                <Column title="R32" matches={LEFT_R32}  onClick={goMatch} size="sm" liveData={liveData} />
                <Column title="R16" matches={LEFT_R16}  onClick={goMatch} size="sm" liveData={liveData} />
                <Column title="QF"  matches={LEFT_QF}   onClick={goMatch} size="md" liveData={liveData} />
                <Column title="SF"  matches={LEFT_SF}   onClick={goMatch} size="md" liveData={liveData} />

                <div className="flex flex-col items-center justify-center flex-shrink-0 px-4 gap-3"
                  style={{ height: TOTAL_HEIGHT }}>
                  <p className="text-yellow-400 text-center"
                    style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, letterSpacing: '0.1em' }}>
                    World Cup Final
                  </p>
                  <MatchSlot match={FINAL[0]} liveData={liveData} onClick={goMatch} size="lg" />
                  <img src="/trophy.png" className="w-32 h-auto opacity-90" alt="Trophy" />
                  <p className="text-gray-400 text-xs text-center">Jul 19 · MetLife Stadium</p>
                </div>

                <Column title="SF"  matches={RIGHT_SF}  onClick={goMatch} size="md" liveData={liveData} />
                <Column title="QF"  matches={RIGHT_QF}  onClick={goMatch} size="md" liveData={liveData} />
                <Column title="R16" matches={RIGHT_R16} onClick={goMatch} size="sm" liveData={liveData} />
                <Column title="R32" matches={RIGHT_R32} onClick={goMatch} size="sm" liveData={liveData} />

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
