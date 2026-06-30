import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getMatchSummary } from '../api/espn'
import matchStatsData from '../ml/match_stats.json'
import predictionsData from '../ml/predictions.json'

const STAT_LABELS = {
  possessionPct:    'Possession %',
  totalShots:       'Total Shots',
  shotsOnTarget:    'Shots on Target',
  shotPct:          'Shot Accuracy',
  accuratePasses:   'Accurate Passes',
  totalPasses:      'Total Passes',
  passPct:          'Pass Accuracy',
  wonCorners:       'Corner Kicks',
  foulsCommitted:   'Fouls',
  yellowCards:      'Yellow Cards',
  redCards:         'Red Cards',
  saves:            'Saves',
  offsides:         'Offsides',
  effectiveTackles: 'Tackles',
  interceptions:    'Interceptions',
}

function StatBar({ label, homeVal, awayVal }) {
  const h = parseFloat(homeVal) || 0
  const a = parseFloat(awayVal) || 0
  const total = h + a || 1
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm text-gray-300 mb-1">
        <span className="font-bold text-white">{h}</span>
        <span className="text-gray-400 text-xs">{label}</span>
        <span className="font-bold text-white">{a}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-white/10">
        <div className="h-full rounded-l-full transition-all"
          style={{ width: `${(h/total)*100}%`, background: 'linear-gradient(90deg, #0A8A3A, #7ED957)' }} />
        <div className="h-full rounded-r-full transition-all"
          style={{ width: `${(a/total)*100}%`, background: 'linear-gradient(90deg, #38AEFF, #0A52CC)' }} />
      </div>
    </div>
  )
}

function KeyEventsDropdown({ events }) {
  const [open, setOpen] = useState(false)
  const goals = events.filter(e => e.text?.includes('Goal!'))
  const others = events.filter(e => !e.text?.includes('Goal!') && e.text)

  return (
    <div className="max-w-3xl mx-auto mb-8">
      {/* goals always visible */}
      {goals.length > 0 && (
        <div className="bg-black/50 rounded-2xl p-4 border border-white/10 mb-3">
          <h2 className="text-lg mb-3" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>Goals</h2>
          {goals.map((ev, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 text-sm">
              <span className="text-gray-400 w-8 flex-shrink-0 text-right">{ev.clock?.displayValue || ''}</span>
              <span className="text-xl flex-shrink-0">⚽</span>
              <span className="text-white text-xs leading-relaxed">{ev.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* other events collapsible */}
      {others.length > 0 && (
        <div className="bg-black/50 rounded-2xl border border-white/10 overflow-hidden">
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition"
          >
            <h2 className="text-lg" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
              Match Events ({others.length})
            </h2>
            <span className="text-gray-400 text-sm">{open ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {open && (
            <div className="px-6 pb-4">
              {others.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 text-sm">
                  <span className="text-gray-400 w-8 flex-shrink-0 text-right">{ev.clock?.displayValue || ''}</span>
                  <span className="text-xl flex-shrink-0">
                    {ev.type?.id === '13' ? '🟨' : ev.text?.toLowerCase().includes('red') ? '🟥' : '📋'}
                  </span>
                  <span className="text-white text-xs leading-relaxed">{ev.text || ev.shortText || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function MatchPage() {
  const { espnId } = useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const summary = await getMatchSummary(espnId)
        setMatch(summary)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [espnId])

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-white bg-gray-950">
      <p className="text-xl animate-pulse">Loading match data...</p>
    </div>
  )
  if (error || !match) return (
    <div className="flex items-center justify-center h-screen text-red-400 bg-gray-950">
      <p>Could not load match. {error}</p>
    </div>
  )

  const comp = match.header?.competitions?.[0]
  const home = comp?.competitors?.find(c => c.homeAway === 'home')
  const away = comp?.competitors?.find(c => c.homeAway === 'away')
  const statusName = comp?.status?.type?.name || ''
  const status = comp?.status?.type?.shortDetail || ''
  const isFinished = comp?.status?.type?.completed
  const wentToPens = statusName === 'STATUS_FINAL_PEN'
  const homeScore = parseInt(home?.score || 0)
  const awayScore = parseInt(away?.score || 0)

  const homeStats = match.homeStats || {}
  const awayStats = match.awayStats || {}

  const scrapedStats = Object.values(matchStatsData).find(
    s => s.espn_id === espnId || s.espn_id === String(espnId)
  )

  // prediction for this match
  const prediction = predictionsData?.next_matches?.find(m => m.espn_id === espnId)

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundImage: 'url(/grass_bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="min-h-screen bg-black/70 p-6">

        <button onClick={() => navigate('/')} className="mb-6 text-gray-400 hover:text-white text-sm transition">
          Back to Dashboard
        </button>

        {/* match header */}
        <div className="text-center mb-8">
          <p className="text-gray-400 text-sm mb-2">{status}</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6"
            style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
            {match.homeTeam} vs. {match.awayTeam}
          </h1>
          <div className="flex items-center justify-center gap-6 md:gap-8 mb-2">
            <div className="text-center">
              <img src={match.homeLogo} className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover mx-auto mb-2"
                onError={e => e.target.style.display='none'} />
              <p className="text-xs text-gray-300">{match.homeTeam}</p>
            </div>
            <div className="text-center">
  <div className="text-5xl md:text-6xl font-bold" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
    {home?.score ?? '-'} - {away?.score ?? '-'}
  </div>
  {wentToPens && (
    <p className="text-yellow-400 text-xs mt-1 tracking-wide uppercase">Decided on Penalties</p>
  )}
</div>
            <div className="text-center">
              <img src={match.awayLogo} className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover mx-auto mb-2"
                onError={e => e.target.style.display='none'} />
              <p className="text-xs text-gray-300">{match.awayTeam}</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm">{comp?.venue?.fullName}</p>
        </div>

        {/* prediction panel for upcoming matches */}
        {!isFinished && prediction && (
          <div className="max-w-3xl mx-auto mb-6 rounded-xl p-4 border border-green-400/30 bg-green-900/20">
            <p className="text-green-300 text-sm text-center mb-2 font-bold">Model Prediction</p>
            <div className="flex justify-around text-center text-xs">
              <div>
                <p className="text-gray-400">XGBoost</p>
                <p className="text-white font-bold">{prediction.xgboost_pick}</p>
              </div>
              <div>
                <p className="text-gray-400">Elo</p>
                <p className="text-white font-bold">{prediction.elo_pick}</p>
              </div>
              <div>
                <p className="text-gray-400">Consensus</p>
                <p className="text-green-400 font-bold">{prediction.consensus}</p>
                <p className="text-gray-500">{prediction.confidence} confidence</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <div className="flex-1 bg-green-900/40 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-400">{match.homeTeam}</p>
                <p className="text-white font-bold">{(prediction.home_win_prob*100).toFixed(0)}%</p>
              </div>
              <div className="flex-1 bg-white/5 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-400">Draw</p>
                <p className="text-white font-bold">{(prediction.draw_prob*100).toFixed(0)}%</p>
              </div>
              <div className="flex-1 bg-blue-900/40 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-400">{match.awayTeam}</p>
                <p className="text-white font-bold">{(prediction.away_win_prob*100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        )}

        {/* stat bars */}
        {Object.keys(homeStats).length > 0 ? (
          <div className="max-w-3xl mx-auto bg-black/50 rounded-2xl p-6 border border-white/10 mb-6">
            <div className="flex justify-between text-sm font-bold mb-6">
              <span className="text-green-400">{match.homeTeam}</span>
              <span className="text-gray-400">Stats</span>
              <span className="text-blue-400">{match.awayTeam}</span>
            </div>
            {Object.entries(STAT_LABELS).map(([key, label]) => {
              const hv = homeStats[key]
              const av = awayStats[key]
              if (hv == null && av == null) return null
              return <StatBar key={key} label={label} homeVal={hv} awayVal={av} />
            })}
          </div>
        ) : scrapedStats ? (
          <div className="max-w-3xl mx-auto bg-black/50 rounded-2xl p-6 border border-white/10 mb-6">
            <div className="flex justify-between text-sm font-bold mb-6">
              <span className="text-green-400">{match.homeTeam}</span>
              <span className="text-gray-400">Stats</span>
              <span className="text-blue-400">{match.awayTeam}</span>
            </div>
            <StatBar label="Possession %" homeVal={scrapedStats.home_possession} awayVal={scrapedStats.away_possession} />
            <StatBar label="Total Shots" homeVal={scrapedStats.home_shots} awayVal={scrapedStats.away_shots} />
            <StatBar label="Shots on Target" homeVal={scrapedStats.home_shots_on_target} awayVal={scrapedStats.away_shots_on_target} />
            <StatBar label="Pass Accuracy" homeVal={scrapedStats.home_pass_pct} awayVal={scrapedStats.away_pass_pct} />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto text-center text-gray-400 mb-6">
            <p>Match stats not available yet.</p>
          </div>
        )}

        {/* key events dropdown */}
        {match.keyEvents?.length > 0 && (
          <KeyEventsDropdown events={match.keyEvents} />
        )}

      </div>
    </div>
  )
}
