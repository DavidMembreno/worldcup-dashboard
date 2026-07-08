import { useNavigate } from 'react-router-dom'
import { useWorldCup } from '../context/WorldCupContext'

export default function MonteCarloPage() {
  const navigate = useNavigate()
  const { state } = useWorldCup()
  const mc = state.predictions?.monte_carlo

  if (!mc) return (
    <div className="min-h-screen bg-black/80 text-white flex items-center justify-center">
      <p className="text-gray-400">Run retrain.py to generate Monte Carlo data</p>
    </div>
  )

  const ranked = mc.ranked || []
  const winner = mc.winner
  const sims = mc.simulations || 10000

  const roundColors = {
    'Group Stage': 'text-red-400',
    'R32': 'text-orange-400',
    'R16': 'text-yellow-400',
    'QF': 'text-blue-400',
    'SF': 'text-purple-400',
    'Final': 'text-green-400',
    'Champion': 'text-yellow-300',
  }

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
          Monte Carlo Simulation
        </h1>
        <p className="text-gray-400 text-center text-sm mb-2">
          {sims.toLocaleString()} tournament simulations using Elo ratings
        </p>
        <p className="text-gray-500 text-center text-xs mb-8 max-w-xl mx-auto">
          Each simulation runs the full tournament bracket - group stage, R32, R16, QF, SF, Final.
          Win probability per match is derived from each team's Elo rating.
          The percentage shows how often each team won across all simulations.
        </p>

        {/* winner card */}
        <div className="max-w-sm mx-auto mb-8 rounded-2xl p-6 text-center border border-yellow-400/30"
          style={{ background: 'rgba(234,179,8,0.1)' }}>
          <p className="text-gray-400 text-xs mb-1">Monte Carlo Predicted Winner</p>
          <p className="text-4xl font-bold text-yellow-400 mb-1"
            style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
            {winner?.team}
          </p>
          <p className="text-2xl font-bold text-white">
            {((winner?.probability || 0) * 100).toFixed(1)}%
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Won {Math.round((winner?.probability || 0) * sims)} of {sims.toLocaleString()} simulations
          </p>
        </div>

        {/* how it differs from ensemble */}
        <div className="max-w-3xl mx-auto mb-8 rounded-2xl p-5 border border-white/10"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <h2 className="text-lg font-bold mb-3"
            style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
            How This Differs From the Ensemble Model
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-green-400 font-bold mb-1">Ensemble Model</p>
              <p className="text-gray-300 text-xs leading-relaxed">
                Combines current form (50%), XGBoost stats (25%), and Elo (25%).
                Heavily weighted toward what is happening RIGHT NOW in WC26.
                France leads because they just beat Senegal 3-1 with strong underlying stats.
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-yellow-400 font-bold mb-1">Monte Carlo</p>
              <p className="text-gray-300 text-xs leading-relaxed">
  Simulates the full bracket 10,000 times using Elo ratings updated with every
  finished WC26 match. No possession or pass stats - just team strength based on
  results. Morocco leads because they have the highest Elo among WC26 teams after
  2025-26 competitive matches including this tournament.
</p>
            </div>
          </div>
        </div>

        {/* full rankings table */}
        <div className="max-w-4xl mx-auto bg-black/50 rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
  All {ranked.length} Active Teams Ranked
</h2>
            <p className="text-gray-500 text-xs">Click any team for details</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs">
                  <th className="text-left px-4 py-3 font-normal">#</th>
                  <th className="text-left px-4 py-3 font-normal">Team</th>
                  <th className="text-center px-4 py-3 font-normal">Win %</th>
                  <th className="text-center px-4 py-3 font-normal">Wins / {sims.toLocaleString()}</th>
                  <th className="text-center px-4 py-3 font-normal">Likely Exit</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((t, i) => (
                  <tr
                    key={t.team}
                    onClick={() => navigate(`/team/${encodeURIComponent(t.team)}`)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 text-white font-medium">{t.team}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(t.probability * 100 * 5, 100)}%`,
                              background: 'linear-gradient(90deg, #eab308, #f97316)'
                            }}
                          />
                        </div>
                        <span className="text-yellow-300 font-bold text-xs w-12">
                          {(t.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-400">
                      {Math.round(t.probability * sims)}
                    </td>
                    <td className={`px-4 py-3 text-center text-xs font-medium ${roundColors[t.likely_exit] || 'text-gray-400'}`}>
                      {t.likely_exit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
