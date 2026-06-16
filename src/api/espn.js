const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'

const GROUP_DATES = [
  '20260611','20260612','20260613','20260614','20260615',
  '20260616','20260617','20260618','20260619','20260620',
  '20260621','20260622','20260623','20260624','20260625',
  '20260626','20260627','20260628'
]

export async function getAllFixtures() {
  const allEvents = []

  await Promise.all(GROUP_DATES.map(async (date) => {
    const res = await fetch(`${BASE}/scoreboard?dates=${date}`)
    const data = await res.json()
    const events = data.events || []
    events.forEach(e => {
      const comp = e.competitions?.[0]
      const home = comp?.competitors?.find(c => c.homeAway === 'home')
      const away = comp?.competitors?.find(c => c.homeAway === 'away')
      allEvents.push({
        id: e.id,
        name: e.name,
        date: e.date,
        status: comp?.status?.type?.name,
        finished: comp?.status?.type?.completed,
        home_team_name_en: home?.team?.displayName,
        away_team_name_en: away?.team?.displayName,
        home_score: home?.score ?? '-',
        away_score: away?.score ?? '-',
        home_flag: `https://a.espncdn.com/i/teamlogos/countries/500/${home?.team?.abbreviation?.toLowerCase()}.png`,
        away_flag: `https://a.espncdn.com/i/teamlogos/countries/500/${away?.team?.abbreviation?.toLowerCase()}.png`,
        venue: comp?.venue?.fullName || '',
      })
    })
  }))

  return allEvents.sort((a, b) => new Date(a.date) - new Date(b.date))
}

export async function getMatchSummary(espnId) {
  const res = await fetch(`${BASE}/summary?event=${espnId}`)
  const data = await res.json()

  // always use header competitors for correct home/away order
  const comp = data.header?.competitions?.[0]
  const homeComp = comp?.competitors?.find(c => c.homeAway === 'home')
  const awayComp = comp?.competitors?.find(c => c.homeAway === 'away')

  // match boxscore teams by display name
  const teams = data.boxscore?.teams || []
  const homeBox = teams.find(t => t.team?.displayName === homeComp?.team?.displayName)
  const awayBox = teams.find(t => t.team?.displayName === awayComp?.team?.displayName)

  const parseStats = (teamObj) => {
    const stats = {}
    teamObj?.statistics?.forEach(s => { stats[s.name] = s.value ?? s.displayValue })
    return stats
  }

  return {
    homeStats: parseStats(homeBox),
    awayStats: parseStats(awayBox),
    homeTeam: homeComp?.team?.displayName,
    awayTeam: awayComp?.team?.displayName,
    homeLogo: `https://a.espncdn.com/i/teamlogos/countries/500/${homeComp?.team?.abbreviation?.toLowerCase()}.png`,
    awayLogo: `https://a.espncdn.com/i/teamlogos/countries/500/${awayComp?.team?.abbreviation?.toLowerCase()}.png`,
    homeScore: homeComp?.score,
    awayScore: awayComp?.score,
    keyEvents: data.keyEvents || [],
    rosters: data.rosters || [],
    header: data.header || {},
  }
}

export async function getStandings() {
  const res = await fetch(`${BASE}/standings`)
  const data = await res.json()
  return data.standings || []
}

export function parseScorers(keyEvents) {
  const scorers = []
  keyEvents.forEach(e => {
    const text = e.text || ''
    const team = e.team?.displayName
    const minute = e.clock?.displayValue
    if (!team) return
    // ESPN goal events contain "Goal!" in the text
    if (text.includes('Goal!') || text.toLowerCase().includes('goal')) {
      // extract player name — comes after "Goal! TeamName Score."
      const match = text.match(/Goal!.*?\d[-–]\d\.\s+([^(]+)\s+\(/)
      const player = match ? match[1].trim() : null
      if (player) {
        scorers.push({ player, team, minute })
      }
    }
  })
  return scorers
}

export function parseWaterBreaks(keyEvents) {
  return keyEvents.filter(e =>
    e.text?.toLowerCase().includes('drinks break') ||
    e.text?.toLowerCase().includes('water break')
  ).length
}
