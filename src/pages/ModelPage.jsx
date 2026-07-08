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
  const activeTeams = predictions?.active_teams || []

  const allTeams = Object.keys(eloRatings).map(team => ({
    team,
    elo: eloRatings[team] || 1500,
    form: formScores[team] || 0,
    xgb: xgbScores[team] || 0,
    probability: (teams.find(t => t.team === team)?.probability || 0) * 100,
    active: activeTeams.includes(team),
  })).sort((a, b) => b.probability - a.probability)

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundImage: 'url(/grass_bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
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
            <h3 className="font-bold text-green-400 mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18 }}>
              Elo Rating ({Math.round((weights.elo || 0.25) * 100)}%)
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Built from 2025-2026 international results only, not all-time historical data.
              A win against a stronger team moves the rating more than beating a weaker side.
              Updated after every WC26 match at a higher learning rate than pre-tournament data.
            </p>
          </div>
          <div className="bg-black/50 rounded-2xl p-5 border border-white/10">
            <h3 className="font-bold text-blue-400 mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18 }}>
              XGBoost ({Math.round((weights.xgb || 0.25) * 100)}%)
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              A machine learning model trained on in-game stats from WC26 matches, weighted heavily
              against pre-tournament history. It tries to capture how a team is performing on the
              pitch, not just whether they won. Possession and passing matter here, though they
              do not tell the full story for every style of team.
            </p>
          </div>
          <div className="bg-black/50 rounded-2xl p-5 border border-white/10">
            <h3 className="font-bold text-yellow-400 mb-2" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18 }}>
              Current Form ({Math.round((weights.form || 0.50) * 100)}%)
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Pure WC26 results only. Points per game plus goal differential, weighted by opponent
              strength using FIFA rankings. Beating a top-10 side counts significantly more than
              beating a bottom-10 side. This carries the most weight because tournament performance
              is a better predictor than pre-tournament reputation.
            </p>
          </div>
        </div>

        {/* why these stats */}
        <div className="max-w-3xl mx-auto mb-8 bg-black/50 rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl mb-4" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
            A Note on the Underlying Stats
          </h2>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            The XGBoost component uses possession, shots on target, and pass accuracy as features.
            These stats generally correlate with quality across a large sample of matches, which
            is why they were chosen for model training.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            That said, they are imperfect signals at the individual match level.
            Counter-attacking teams and defensively structured sides regularly outperform what
            these numbers would suggest. Morocco reached the quarterfinals with some of the
            lowest possession figures in the tournament. A team can control the ball for
            70 minutes and lose to a side that had three shots.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            <strong className="text-white">Possession %</strong> reflects how much a team controls
            the tempo of play. It is a meaningful signal in aggregate but can be misleading for
            teams that deliberately play on the counter.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            <strong className="text-white">Shots on Target</strong> is the most direct link between
            in-game performance and goals. It tends to be more predictive than possession alone.
          </p>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            <strong className="text-white">Pass Accuracy %</strong> captures technical quality and
            how well a team maintains structure. It is most meaningful when compared against
            the opponent in the same match rather than as a standalone number.
          </p>
          <p className="text-gray-400 text-xs mt-4 border-t border-white/10 pt-4">
            XGBoost carries 25% of the ensemble weight precisely because results-based form is
            more reliable than underlying stats alone. The model is aware of its own limitations.
          </p>
        </div>

        {/* full rankings table */}
        <div className="max-w-4xl mx-auto bg-black/50 rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
              All Teams Ranked
            </h2>
            <p className="text-gray-500 text-xs">{activeTeams.length} teams still active</p>
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
                    style={{ opacity: t.active ? 1 : 0.4 }}
                  >
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: t.active ? 'white' : '#6b7280' }}>
                      {t.team}
                      {!t.active && <span className="ml-2 text-red-400 text-xs">eliminated</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-blue-300">{Math.round(t.elo)}</td>
                    <td className="px-4 py-3 text-center text-yellow-300">{t.form.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-center text-green-300">{t.xgb.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold" style={{ color: t.active ? 'white' : '#6b7280' }}>
                        {t.probability > 0 ? t.probability.toFixed(2) + '%' : '--'}
                      </span>
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
