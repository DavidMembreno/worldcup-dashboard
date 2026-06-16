import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorldCup } from '../context/WorldCupContext'

export default function AllGamesPage() {
  const navigate = useNavigate()
  const { state } = useWorldCup()
  const [sortOrder, setSortOrder] = useState('desc')
  const [filter, setFilter] = useState('all')

  const finished = state.fixtures.filter(f => f.finished === true)
  const upcoming = state.fixtures.filter(f => f.finished !== true)

  const displayList = filter === 'upcoming'
    ? [...upcoming].sort((a, b) => sortOrder === 'desc'
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date))
    : filter === 'finished'
    ? [...finished].sort((a, b) => sortOrder === 'desc'
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date))
    : [...state.fixtures].sort((a, b) => sortOrder === 'desc'
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date))

  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundImage: 'url(/grass_bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="min-h-screen bg-black/75 p-6">

        <button onClick={() => navigate('/')} className="mb-6 text-gray-400 hover:text-white text-sm transition">
          Back to Dashboard
        </button>

        <h1 className="text-4xl font-bold text-center mb-6"
          style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.05em' }}>
          All Matches
        </h1>

        {/* controls */}
        <div className="flex items-center justify-center gap-3 mb-8 flex-wrap">
          {['all','finished','upcoming'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm capitalize transition border ${
                filter === f
                  ? 'bg-white/20 border-white/40 text-white'
                  : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              {f === 'all' ? `All (${state.fixtures.length})` :
               f === 'finished' ? `Finished (${finished.length})` :
               `Upcoming (${upcoming.length})`}
            </button>
          ))}
          <button
            onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
            className="px-4 py-2 rounded-full text-sm border border-white/10 text-gray-400 hover:border-white/20 transition"
          >
            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </button>
        </div>

        {/* match list */}
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayList.map(match => (
            <div
              key={match.id}
              onClick={() => navigate(`/match/${match.id}`)}
              className="rounded-2xl overflow-hidden border border-white/10 cursor-pointer hover:border-white/30 transition"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            >
              {/* header */}
              <div
                className="px-4 py-3 text-center"
                style={{ background: match.finished ? 'linear-gradient(90deg, #0A8A3A88, #7ED95788)' : 'rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center justify-center gap-2">
                  <img src={match.home_flag} className="w-5 h-5 rounded-full object-cover"
                    onError={e => e.target.style.display='none'} />
                  <span className="text-white text-sm font-bold">{match.home_team_name_en}</span>
                  <span className="text-gray-400 text-xs">vs</span>
                  <span className="text-white text-sm font-bold">{match.away_team_name_en}</span>
                  <img src={match.away_flag} className="w-5 h-5 rounded-full object-cover"
                    onError={e => e.target.style.display='none'} />
                </div>
              </div>

              {/* score or date */}
              <div className="px-4 py-4 text-center">
                {match.finished ? (
                  <p className="text-4xl font-bold tracking-widest">
                    {match.home_score} - {match.away_score}
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm">
                    {new Date(match.date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-1">{match.venue}</p>
              </div>

              {/* see summary */}
              <div className="px-4 pb-3 text-center">
                <span className="text-xs text-gray-400">
                  {match.finished ? 'See Summary' : 'Preview'}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
