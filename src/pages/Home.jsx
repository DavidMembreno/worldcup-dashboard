import { useWorldCup } from '../context/WorldCupContext'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const { state } = useWorldCup()
  const navigate = useNavigate()

  if (state.loading) return (
    <div className="flex items-center justify-center h-screen text-white bg-gray-950">
      <p className="text-xl animate-pulse">Loading World Cup data...</p>
    </div>
  )

  if (state.error) return (
    <div className="flex items-center justify-center h-screen text-red-400 bg-gray-950">
      <p>Error: {state.error}</p>
    </div>
  )

  const finished = state.fixtures.filter(f => f.finished === true)
  const upcoming = state.fixtures.filter(f => f.finished !== true)
  const recent = finished.slice(-3).reverse()

  return (
    <div
      className="min-h-screen text-white"
      style={{
        backgroundImage: 'url(/grass_bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="min-h-screen bg-black/60 p-6">

        {/* Projected Winner Banner — clickable → history page */}
        <div className="flex justify-center mb-4 mt-6">
          <div
            onClick={() => navigate('/history')}
            className="px-12 py-5 rounded-full text-center cursor-pointer hover:opacity-90 transition"
            style={{ background: 'linear-gradient(90deg, #0A8A3A, #7ED957)' }}
          >
            <p
              className="text-4xl font-bold text-white"
              style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}
            >
              Projected Winner: {state.predictions?.tournament_winner?.team || 'TBD'}
            </p>
          </div>
        </div>

        {/* subtle hint */}
        <p className="text-center text-gray-500 text-xs mb-8">
          Click to see prediction history
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-10 max-w-2xl mx-auto">
          <div className="bg-black/40 rounded-xl p-4 text-center border border-white/10">
            <p className="text-gray-400 text-sm">Total Matches</p>
            <p className="text-3xl font-bold">{state.fixtures.length}</p>
          </div>
          <div className="bg-black/40 rounded-xl p-4 text-center border border-white/10">
            <p className="text-gray-400 text-sm">Finished</p>
            <p className="text-3xl font-bold text-green-400">{finished.length}</p>
          </div>
          <div className="bg-black/40 rounded-xl p-4 text-center border border-white/10">
            <p className="text-gray-400 text-sm">Upcoming</p>
            <p className="text-3xl font-bold text-blue-400">{upcoming.length}</p>
          </div>
        </div>

        {/* Recent Games */}
        <h2
          className="text-center text-3xl mb-2"
          style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}
        >
          Recent Games
        </h2>
        <p className="text-center mb-6">
          <button
            onClick={() => navigate('/games')}
            className="text-gray-400 hover:text-white text-xs underline underline-offset-2 transition"
          >
            View all {state.fixtures.length} matches
          </button>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {recent.length === 0 ? (
            <p className="text-gray-400 text-center col-span-3">No finished matches yet</p>
          ) : (
            recent.map(match => (
              <div
                key={match.id}
                className="rounded-2xl overflow-hidden border border-white/10"
                style={{ background: 'rgba(0,0,0,0.5)' }}
              >
                <div
                  className="px-4 py-3 text-center font-bold text-white text-sm"
                  style={{ background: 'linear-gradient(90deg, #0A8A3A88, #7ED95788)' }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <img
                      src={match.home_flag}
                      className="w-6 h-6 rounded-full object-cover"
                      onError={e => e.target.style.display='none'}
                    />
                    <span>{match.home_team_name_en}</span>
                    <span className="text-gray-300">vs</span>
                    <span>{match.away_team_name_en}</span>
                    <img
                      src={match.away_flag}
                      className="w-6 h-6 rounded-full object-cover"
                      onError={e => e.target.style.display='none'}
                    />
                  </div>
                </div>

                <div className="px-4 py-6 text-center">
                  <p className="text-5xl font-bold tracking-widest">
                    {match.home_score} - {match.away_score}
                  </p>
                  <p className="text-gray-400 text-xs mt-2">{match.venue}</p>
                </div>

                <div className="px-4 pb-4 text-center">
                  <button
                    onClick={() => navigate(`/match/${match.id}`)}
                    className="px-6 py-2 rounded-full text-sm font-semibold text-white border border-white/30 hover:bg-white/10 transition"
                  >
                    See Summary
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end max-w-5xl mx-auto mt-8">
          <button
            onClick={() => navigate('/bracket')}
            className="px-6 py-3 rounded-full text-sm font-semibold text-white border border-white/30 hover:bg-white/10 transition"
          >
            See Full Game Bracket
          </button>
        </div>

      </div>
    </div>
  )
}
