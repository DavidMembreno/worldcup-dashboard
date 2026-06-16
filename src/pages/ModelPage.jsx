import { useNavigate } from 'react-router-dom'
import { useWorldCup } from '../context/WorldCupContext'

export default function ModelPage() {
  const navigate = useNavigate()
  const { state } = useWorldCup()
  const predictions = state.predictions

  const teams = predictions?.finalist_probabilities || []
  const eloRatings = predictions?.elo_ratings || {}
  const formScores = predictions?.form_scores || {}
  const xgbScores = predictions?.xgb_scores || {}
  const weights = predictions?.weights || {}

  // build full ranked table
  const allTeams = Object.keys(eloRatings).map(team => ({
    team,
    elo: eloRatings[team] || 1500,
    form: formScores[team] || 0,
    xgb: xgbScores[team] || 0,
    probability: (teams.find(t => t.team === team)?.probability || 0) * 100,
  })).sort((a, b) => b.probability - a.probability)

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundImage: 'url(/src/assets/grass_bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="min-h-screen bg-black/80 p-6">

        <button onClick={() => navigate(-1)} className="mb-6 text-gray-400 hover:text-white text-sm transition">
          Back
        </button>

        <h1 className="text-5xl font-bold text-center mb-2"
          style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
          Prediction Model
        </h1>
        <p className="text-gray-400 text-center text-sm mb-8">
          Last updated: {predictions?.generated_at ? new Date(predictions.generated_at).toLocaleDateString() : 'N/A'}
          {' · '}{predictions?.matches_used || 0} matches used
        </p>

        {/* how it works */}
        <div className="max-w-3xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/50 rounded-2xl p-5 border border-white/10">
            <div className="text-3xl mb-2">📊</div>
            <h3 className="font-bold text-green-400 mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18 }}>
              Elo Rating ({Math.round((weights.elo || 0.25) * 100)}%)
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Based on 2025-2026 international match results only. Win against a strong team = big rating bump.
              Updated after every WC26 match at higher weight. Reflects recent team trajectory before this tournament.
            </p>
          </div>
          <div className="bg-black/50 rounded-2xl p-5 border border-white/10">
            <div className="text-3xl mb-2">🤖</div>
            <h3 className="font-bold text-blue-400 mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18 }}>
              XGBoost ({Math.round((weights.xgb || 0.25) * 100)}%)
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Machine learning model trained on possession, shots on target, and pass accuracy from WC26 matches
              (weighted 5x vs historical). Answers: how well is this team actually playing in this tournament?
            </p>
          </div>
          <div className="bg-black/50 rounded-2xl p-5 border border-white/10">
            <div className="text-3xl mb-2">⚽</div>
            <h3 className="font-bold text-yellow-400 mb-1" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18 }}>
              Current Form ({Math.round((weights.form || 0.50) * 100)}%)
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Pure WC26 results only. Zero historical data. Points per game + weighted goal difference.
              Highest weight because what matters most is what's happening RIGHT NOW in this tournament.
            </p>
          </div>
        </div>

        {/* why these stats */}
        <div className="max-w-3xl mx-auto mb-8 bg-black/50 rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
            Why Possession, Shots and Passes?
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            Goals are noisy - a team can dominate a game and still lose 1-0 to a counter-attack.
            Underlying stats tell a more honest story about which team is actually the better side.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            <strong className="text-white">Possession %</strong> - controls the tempo of the game.
            Teams that control the ball control the match.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            <strong className="text-white">Shots on Target</strong> - the most direct predictor of goals.
            A team with 8 shots on target is genuinely dangerous regardless of the scoreline.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            <strong className="text-white">Pass Accuracy %</strong> - reflects technical quality and
            how well a team maintains structure under pressure. Elite teams typically pass at 85%+.
          </p>
          <p className="text-gray-400 text-xs mt-4 border-t border-white/10 pt-4">

          </p>
        </div>

        {/* full rankings table */}
        <div className="max-w-4xl mx-auto bg-black/50 rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
              All Teams Ranked
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-xs">
                  <th className="text-left px-4 py-3 font-normal">#</th>
                  <th className="text-left px-4 py-3 font-normal">Team</th>
                  <th className="text-center px-4 py-3 font-normal">Elo</th>
                  <th className="text-center px-4 py-3 font-normal">Form %</th>
                  <th className="text-center px-4 py-3 font-normal">XGB %</th>
                  <th className="text-center px-4 py-3 font-normal">Win Prob</th>
                </tr>
              </thead>
              <tbody>
                {allTeams.map((t, i) => (
                  <tr
                    key={t.team}
                    onClick={() => navigate(`/team/${encodeURIComponent(t.team)}`)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 text-white font-medium">{t.team}</td>
                    <td className="px-4 py-3 text-center text-blue-300">{Math.round(t.elo)}</td>
                    <td className="px-4 py-3 text-center text-yellow-300">{t.form.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-center text-green-300">{t.xgb.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-white">{t.probability.toFixed(2)}%</span>
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
