import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorldCup } from '../context/WorldCupContext'

const GROUP_COLORS = {
  'Group A': '#22c55e', 'Group B': '#ef4444', 'Group C': '#f97316',
  'Group D': '#3b82f6', 'Group E': '#a855f7', 'Group F': '#eab308',
  'Group G': '#ec4899', 'Group H': '#06b6d4', 'Group I': '#8b5cf6',
  'Group J': '#f59e0b', 'Group K': '#10b981', 'Group L': '#6366f1',
}

export default function GroupBox({ group }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const { state } = useWorldCup()
  const color = GROUP_COLORS[group.name] || '#666'

  // find matches for this group from fixtures
  const groupLetter = group.name.split(' ')[1]
  const groupMatches = state.fixtures.filter(f => {
    const teams = group.entries.map(e => e.team.displayName)
    return teams.includes(f.home_team_name_en) && teams.includes(f.away_team_name_en)
  })

  return (
    <div style={{ position: 'relative' }}>
      {/* collapsed box */}
      <div
        className="rounded-xl overflow-hidden transition-all"
        style={{
          border: `2px solid ${color}`,
          background: 'rgba(10,10,20,0.9)',
          width: expanded ? 280 : 110,
          cursor: 'pointer',
        }}
      >
        {/* header — always visible, click to expand */}
        <div
          className="py-1 text-center text-xs font-bold flex items-center justify-between px-2"
          style={{
            background: color,
            fontFamily: 'Bebas Neue, sans-serif',
            letterSpacing: '0.05em',
            fontSize: 13
          }}
          onClick={() => setExpanded(e => !e)}
        >
          <span>{group.name}</span>
          <span style={{ fontSize: 10, opacity: 0.8 }}>{expanded ? '▲' : '▼'}</span>
        </div>

        {/* COLLAPSED VIEW — 2x2 flag grid */}
        {!expanded && (
          <div className="grid grid-cols-2 gap-1 p-1.5">
            {group.entries.slice(0, 4).map((entry, i) => (
              <div
                key={i}
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/team/${encodeURIComponent(entry.team.displayName)}`)
                }}
                className="flex flex-col items-center gap-0.5 hover:opacity-80 transition"
                title={entry.team.displayName}
              >
                <img
                  src={entry.team.logos?.[0]?.href}
                  className="w-8 h-8 rounded-full object-cover"
                  onError={e => e.target.style.display = 'none'}
                />
                <span className="text-white text-center" style={{ fontSize: 9 }}>
                  {entry.team.abbreviation || entry.team.displayName?.slice(0, 3).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* EXPANDED VIEW */}
        {expanded && (
          <div className="p-3">

            {/* standings table */}
            <div className="mb-3">
              <p className="text-gray-400 text-xs mb-2 uppercase tracking-widest">Standings</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-white/10">
                    <th className="text-left py-1 font-normal">#</th>
                    <th className="text-left py-1 font-normal">Team</th>
                    <th className="text-center py-1 font-normal">P</th>
                    <th className="text-center py-1 font-normal">W</th>
                    <th className="text-center py-1 font-normal">D</th>
                    <th className="text-center py-1 font-normal">L</th>
                    <th className="text-center py-1 font-normal">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {group.entries.map((entry, i) => (
                    <tr
                      key={i}
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/team/${encodeURIComponent(entry.team.displayName)}`)
                      }}
                    >
                      <td className="py-1 text-gray-400">{entry.rank}</td>
                      <td className="py-1">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={entry.team.logos?.[0]?.href}
                            className="w-4 h-4 rounded-full object-cover"
                            onError={e => e.target.style.display = 'none'}
                          />
                          <span className="text-white truncate" style={{ maxWidth: 80 }}>
                            {entry.team.displayName}
                          </span>
                          {entry.note && (
                            <div
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: `#${entry.note.color}` }}
                              title={entry.note.description}
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-1 text-center text-gray-400">{entry.gp}</td>
                      <td className="py-1 text-center text-green-400">{entry.w}</td>
                      <td className="py-1 text-center text-gray-400">{entry.d}</td>
                      <td className="py-1 text-center text-red-400">{entry.l}</td>
                      <td className="py-1 text-center font-bold text-white">{entry.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* group matches */}
            <div>
              <p className="text-gray-400 text-xs mb-2 uppercase tracking-widest">Matches</p>
              {groupMatches.length === 0 ? (
                <p className="text-gray-500 text-xs">No matches found</p>
              ) : (
                groupMatches.map(match => (
                  <div
                    key={match.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/match/${match.id}`)
                    }}
                    className="flex items-center justify-between py-1.5 border-b border-white/5 hover:bg-white/5 cursor-pointer transition rounded px-1"
                  >
                    <div className="flex items-center gap-1 flex-1">
                      <img
                        src={match.home_flag}
                        className="w-4 h-4 rounded-full object-cover"
                        onError={e => e.target.style.display = 'none'}
                      />
                      <span className="text-white truncate" style={{ fontSize: 10, maxWidth: 65 }}>
                        {match.home_team_name_en}
                      </span>
                    </div>
                    <div className="text-center px-1">
                      {match.finished ? (
                        <span className="font-bold text-white" style={{ fontSize: 11 }}>
                          {match.home_score} - {match.away_score}
                        </span>
                      ) : (
                        <span className="text-gray-500" style={{ fontSize: 9 }}>
                          {new Date(match.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-1 justify-end">
                      <span className="text-white truncate" style={{ fontSize: 10, maxWidth: 65 }}>
                        {match.away_team_name_en}
                      </span>
                      <img
                        src={match.away_flag}
                        className="w-4 h-4 rounded-full object-cover"
                        onError={e => e.target.style.display = 'none'}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
