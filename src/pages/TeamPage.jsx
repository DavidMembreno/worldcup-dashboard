import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useWorldCup } from '../context/WorldCupContext'
import { getMatchSummary } from '../api/espn'
import matchStatsData from '../ml/match_stats.json'

export default function TeamPage() {
  const { teamName } = useParams()
  const navigate = useNavigate()
  const { state } = useWorldCup()
  const name = decodeURIComponent(teamName)
  const [matchFilter, setMatchFilter] = useState('all')
  const [loadingScorers, setLoadingScorers] = useState(true)
  const [scorerMap, setScorerMap] = useState({})

  const teamMatches = state.fixtures.filter(f =>
    f.finished === true &&
    (f.home_team_name_en === name || f.away_team_name_en === name)
  )

  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0
  teamMatches.forEach(m => {
    const isHome = m.home_team_name_en === name
    const gf = parseInt(isHome ? m.home_score : m.away_score) || 0
    const ga = parseInt(isHome ? m.away_score : m.home_score) || 0
    goalsFor += gf
    goalsAgainst += ga
    if (gf > ga) wins++
    else if (gf === ga) draws++
    else losses++
  })

  const teamStats = Object.values(matchStatsData).filter(
    s => s.home === name || s.away === name
  )

  const avgStat = (key) => {
    const vals = teamStats.map(s => {
      const isHome = s.home === name
      return parseFloat(isHome ? s[`home_${key}`] : s[`away_${key}`])
    }).filter(v => !isNaN(v))
    if (!vals.length) return null
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
  }

  const flag = teamMatches[0]
    ? teamMatches[0].home_team_name_en === name
      ? teamMatches[0].home_flag
      : teamMatches[0].away_flag
    : null

  useEffect(() => {
    setLoadingScorers(false)
  }, [name])

  const predictions = state.predictions?.finalist_probabilities || []
  const teamPrediction = predictions.find(p =>
    p.team?.toLowerCase() === name?.toLowerCase()
  )

  const eloRating = state.predictions?.elo_ratings?.[name]
  const formScore = state.predictions?.form_scores?.[name]
  const xgbScore = state.predictions?.xgb_scores?.[name]

  const getResult = (match) => {
    const isHome = match.home_team_name_en === name
    const gf = parseInt(isHome ? match.home_score : match.away_score)
    const ga = parseInt(isHome ? match.away_score : match.home_score)
    return gf > ga ? 'W' : gf === ga ? 'D' : 'L'
  }

  const filteredMatches = matchFilter === 'all'
    ? teamMatches
    : teamMatches.filter(m => getResult(m) === matchFilter)

  const statCards = [
    { label: 'Wins', value: wins, color: 'text-green-400', filter: 'W' },
    { label: 'Draws', value: draws, color: 'text-yellow-400', filter: 'D' },
    { label: 'Losses', value: losses, color: 'text-red-400', filter: 'L' },
    { label: 'Goals For', value: goalsFor, color: 'text-blue-400', filter: null },
    { label: 'Goals Against', value: goalsAgainst, color: 'text-gray-400', filter: null },
    { label: 'Goal Diff', value: goalsFor - goalsAgainst >= 0 ? `+${goalsFor - goalsAgainst}` : goalsFor - goalsAgainst, color: goalsFor >= goalsAgainst ? 'text-green-400' : 'text-red-400', filter: null },
    { label: 'Matches', value: teamMatches.length, color: 'text-white', filter: null },
    { label: 'Points', value: wins * 3 + draws, color: 'text-yellow-400', filter: null },
  ]

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundImage: 'url(/src/assets/grass_bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="min-h-screen bg-black/75 p-6">

        <button onClick={() => navigate(-1)} className="mb-6 text-gray-400 hover:text-white text-sm transition">
          Back
        </button>

        {/* header */}
        <div className="flex items-center justify-center gap-6 mb-8">
          {flag && (
            <img src={flag} className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
              onError={e => e.target.style.display='none'} />
          )}
          <h1 className="text-6xl font-bold" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
            {name}
          </h1>
        </div>

        {/* stat cards — W/D/L are clickable filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-2">
          {statCards.map((stat, i) => (
            <div
              key={i}
              onClick={() => stat.filter && setMatchFilter(f => f === stat.filter ? 'all' : stat.filter)}
              className={`bg-black/50 rounded-xl p-4 text-center border transition ${
                stat.filter ? 'cursor-pointer hover:border-white/40' : ''
              } ${matchFilter === stat.filter ? 'border-white/60 ring-1 ring-white/30' : 'border-white/10'}`}
            >
              <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              {stat.filter && (
                <p className="text-gray-600 text-xs mt-1">
                  {matchFilter === stat.filter ? 'showing' : 'click to filter'}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* filter indicator */}
        {matchFilter !== 'all' && (
          <div className="max-w-3xl mx-auto mb-6 text-center">
            <button
              onClick={() => setMatchFilter('all')}
              className="text-xs text-gray-400 hover:text-white transition border border-white/20 px-3 py-1 rounded-full"
            >
              Showing {matchFilter === 'W' ? 'Wins' : matchFilter === 'D' ? 'Draws' : 'Losses'} · Clear filter
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">

          {/* avg stats */}
          {teamStats.length > 0 && (
            <div className="bg-black/50 rounded-2xl p-6 border border-white/10">
              <h2 className="text-xl mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
                Avg Match Stats
              </h2>
              {[
                { label: 'Possession %', key: 'possession' },
                { label: 'Total Shots', key: 'shots' },
                { label: 'Shots on Target', key: 'shots_on_target' },
                { label: 'Pass Accuracy %', key: 'pass_pct' },
                { label: 'Total Passes', key: 'passes_total' },
              ].map(({ label, key }) => {
                const val = avgStat(key)
                if (!val) return null
                return (
                  <div key={key} className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400 text-sm">{label}</span>
                    <span className="text-white font-bold text-sm">{val}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* matches played — filtered */}
          <div className="bg-black/50 rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
              {matchFilter === 'all' ? 'Matches Played' :
               matchFilter === 'W' ? 'Wins' :
               matchFilter === 'D' ? 'Draws' : 'Losses'}
              {' '}({filteredMatches.length})
            </h2>
            {filteredMatches.length === 0 ? (
              <p className="text-gray-500 text-sm">No matches in this category</p>
            ) : (
              filteredMatches.map(match => {
                const isHome = match.home_team_name_en === name
                const gf = isHome ? match.home_score : match.away_score
                const ga = isHome ? match.away_score : match.home_score
                const opp = isHome ? match.away_team_name_en : match.home_team_name_en
                const oppFlag = isHome ? match.away_flag : match.home_flag
                const result = getResult(match)
                const resultColor = result === 'W' ? 'text-green-400' : result === 'D' ? 'text-yellow-400' : 'text-red-400'
                return (
                  <div
                    key={match.id}
                    onClick={() => navigate(`/match/${match.id}`)}
                    className="flex items-center justify-between py-2 border-b border-white/5 hover:bg-white/5 cursor-pointer rounded px-1 transition"
                  >
                    <span className={`font-bold text-sm w-6 ${resultColor}`}>{result}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <img src={oppFlag} className="w-5 h-5 rounded-full object-cover"
                        onError={e => e.target.style.display='none'} />
                      <span className="text-white text-sm">{opp}</span>
                    </div>
                    <span className="text-white font-bold text-sm">{gf} - {ga}</span>
                  </div>
                )
              })
            )}
          </div>

          {/* model scores */}
          <div className="bg-black/50 rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
              Model Scores
            </h2>
            {[
              { label: 'Elo Rating', value: eloRating ? Math.round(eloRating) : 'N/A', desc: 'Based on 2025-26 results' },
              { label: 'Form Score', value: formScore ? `${formScore}%` : 'N/A', desc: 'WC26 points + goal diff' },
              { label: 'XGBoost Score', value: xgbScore ? `${xgbScore}%` : 'N/A', desc: 'Possession, shots, passes' },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                <div>
                  <p className="text-white text-sm">{s.label}</p>
                  <p className="text-gray-500 text-xs">{s.desc}</p>
                </div>
                <span className="text-white font-bold">{s.value}</span>
              </div>
            ))}
          </div>

          {/* win probability */}
          <div className="bg-black/50 rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
              Tournament Prediction
            </h2>
            {teamPrediction ? (
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-2">Probability to win World Cup</p>
                <p className="text-5xl font-bold text-green-400" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                  {(teamPrediction.probability * 100).toFixed(1)}%
                </p>
                <div className="mt-4 h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{ width: `${Math.min(teamPrediction.probability * 100 * 10, 100)}%`, background: 'linear-gradient(90deg, #0A8A3A, #7ED957)' }} />
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-500 text-sm mb-4">Model not yet trained</p>
                <p className="text-gray-600 text-xs">Run retrain.py to generate predictions</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
