import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorldCup } from '../context/WorldCupContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const METRICS = [
  { key: 'elo', label: 'Elo Rating', color: '#38AEFF' },
  { key: 'form', label: 'Current Form %', color: '#FACC15' },
  { key: 'xgb', label: 'XGBoost Score %', color: '#34D399' },
  { key: 'mc', label: 'Monte Carlo Win %', color: '#F97316' },
  { key: 'ensemble', label: 'Ensemble Win %', color: '#7ED957' },
]

const TEAM_COLORS = [
  '#FF6B6B','#4ECDC4','#FFD93D','#6C5CE7','#FF8C42',
  '#A8E6CF','#FF6FB5','#45B7D1','#FFA07A','#98D8C8',
  '#F7DC6F','#BB8FCE','#85C1E9','#F8B739','#52BE80',
  '#EC7063','#5DADE2','#F4D03F','#AF7AC5','#48C9B0',
]

export default function StatsComparisonPage() {
  const navigate = useNavigate()
  const { state } = useWorldCup()
  const history = state.predictionHistory || []
  const [metric, setMetric] = useState('elo')
  const [selectedTeams, setSelectedTeams] = useState([])

  const allTeams = useMemo(() => {
    const last = history[history.length - 1]
    if (!last?.team_snapshots) return []
    return Object.keys(last.team_snapshots).sort()
  }, [history])

  const chartData = useMemo(() => {
    return history.map(entry => {
      const point = { date: entry.date }
      if (entry.team_snapshots) {
        Object.entries(entry.team_snapshots).forEach(([team, stats]) => {
          point[team] = stats[metric]
        })
      }
      return point
    })
  }, [history, metric])

  const toggleTeam = (team) => {
    setSelectedTeams(prev =>
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    )
  }

  const clearAll = () => setSelectedTeams([])
  const selectTop5 = () => {
    const last = history[history.length - 1]
    if (!last?.team_snapshots) return
    const top5 = Object.entries(last.team_snapshots)
      .sort((a, b) => b[1][metric] - a[1][metric])
      .slice(0, 5)
      .map(([t]) => t)
    setSelectedTeams(top5)
  }

  const hasEnoughData = history.length > 1

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundImage: 'url(/grass_bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="min-h-screen bg-black/80 p-6">

        <button onClick={() => navigate('/')} className="mb-6 text-gray-400 hover:text-white text-sm transition">
          Back
        </button>

        <h1 className="text-5xl font-bold text-center mb-2"
          style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
          Team Comparison
        </h1>
        <p className="text-gray-400 text-center text-sm mb-8">
          Track how team metrics evolve over the tournament — select teams and a metric to compare
        </p>

        {!hasEnoughData ? (
          <div className="max-w-xl mx-auto text-center bg-black/50 rounded-2xl p-8 border border-white/10">
            <p className="text-gray-300 mb-2">Not enough history yet.</p>
            <p className="text-gray-500 text-sm">
              This chart needs at least 2 days of data. Run retrain.py daily and check back tomorrow.
            </p>
          </div>
        ) : (
          <>
            {/* metric selector */}
            <div className="flex justify-center gap-2 mb-6 flex-wrap">
              {METRICS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={`px-4 py-2 rounded-full text-xs border transition ${
                    metric === m.key
                      ? 'border-white/50 text-white bg-white/10'
                      : 'border-white/10 text-gray-400 hover:border-white/30'
                  }`}
                  style={{ borderColor: metric === m.key ? m.color : undefined }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* team toggle controls */}
            <div className="flex justify-center gap-2 mb-4">
              <button
                onClick={selectTop5}
                className="px-4 py-2 rounded-full text-xs border border-green-400/30 text-green-300 hover:border-green-400/60 transition"
              >
                Show Top 5
              </button>
              <button
                onClick={clearAll}
                className="px-4 py-2 rounded-full text-xs border border-white/10 text-gray-400 hover:border-white/30 transition"
              >
                Clear All
              </button>
            </div>

            {/* chart */}
            <div className="max-w-5xl mx-auto bg-black/50 rounded-2xl p-6 border border-white/10 mb-6">
              {selectedTeams.length === 0 ? (
                <div className="h-96 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">Select teams below to see their {METRICS.find(m=>m.key===metric)?.label} over time</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} />
                    <Tooltip
                      contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {selectedTeams.map((team, i) => (
                      <Line
                        key={team}
                        type="monotone"
                        dataKey={team}
                        stroke={TEAM_COLORS[i % TEAM_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* team toggle grid */}
            <div className="max-w-5xl mx-auto bg-black/50 rounded-2xl p-6 border border-white/10">
              <p className="text-gray-400 text-xs mb-3">Toggle teams to compare ({selectedTeams.length} selected)</p>
              <div className="flex flex-wrap gap-2">
                {allTeams.map(team => {
                  const isSelected = selectedTeams.includes(team)
                  return (
                    <button
                      key={team}
                      onClick={() => toggleTeam(team)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition ${
                        isSelected
                          ? 'border-white/50 text-white bg-white/15'
                          : 'border-white/10 text-gray-500 hover:border-white/30 hover:text-gray-300'
                      }`}
                    >
                      {team}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
