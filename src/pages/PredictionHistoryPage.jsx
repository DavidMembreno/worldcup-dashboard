import { useNavigate } from 'react-router-dom'
import { useWorldCup } from '../context/WorldCupContext'

export default function PredictionHistoryPage() {
  const navigate = useNavigate()
  const { state } = useWorldCup()
  const history = state.predictionHistory || []

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
          Prediction History
        </h1>
        <p className="text-gray-400 text-center text-sm mb-8">
          How the model's predicted winner has changed each day
        </p>

        {history.length === 0 ? (
          <p className="text-center text-gray-500">No history yet — run retrain.py daily to build history</p>
        ) : (
          <div className="max-w-2xl mx-auto">
            {[...history].reverse().map((entry, i) => (
              <div
                key={i}
                className="mb-4 rounded-2xl p-6 border border-white/10"
                style={{ background: i === 0 ? 'rgba(10,138,58,0.15)' : 'rgba(0,0,0,0.5)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-gray-400 text-xs">{entry.date}</p>
                    <p className="text-gray-500 text-xs">{entry.matches_used} matches used</p>
                  </div>
                  {i === 0 && (
                    <span className="text-xs text-green-400 border border-green-400/30 px-2 py-1 rounded-full">
                      Latest
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-gray-400 text-xs mb-1">Predicted Winner</p>
                  <p className="text-3xl font-bold text-white"
                    style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                    {entry.predicted_winner}
                  </p>
                  <p className="text-green-400 text-sm">{(entry.probability * 100).toFixed(1)}% probability</p>
                </div>

                <div>
                  <p className="text-gray-500 text-xs mb-2">Top 5 that day</p>
                  <div className="flex flex-wrap gap-2">
                    {(entry.top5 || []).map((t, j) => (
                      <span
                        key={j}
                        onClick={() => navigate(`/team/${encodeURIComponent(t.team)}`)}
                        className="text-xs px-2 py-1 rounded-full border border-white/10 text-gray-300 cursor-pointer hover:border-white/30 transition"
                        style={{ background: j === 0 ? 'rgba(10,138,58,0.3)' : 'rgba(255,255,255,0.05)' }}
                      >
                        {j + 1}. {t.team} ({(t.probability * 100).toFixed(1)}%)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
