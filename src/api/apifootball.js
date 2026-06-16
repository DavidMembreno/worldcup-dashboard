import axios from 'axios'
import { readCache, writeCache } from '../utils/cache'

const client = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': import.meta.env.VITE_API_FOOTBALL_KEY }
})

export async function getFixtures() {
  const cached = readCache('fixtures')
  if (cached) return cached
  const { data } = await client.get('/fixtures?league=1&season=2026')
  writeCache('fixtures', data.response, false)
  return data.response
}

export async function getStandings() {
  const cached = readCache('standings')
  if (cached) return cached
  const { data } = await client.get('/standings?league=1&season=2026')
  writeCache('standings', data.response, false)
  return data.response
}

export async function getMatchDetails(fixtureId, isFinished = false) {
  const cached = readCache(`match_${fixtureId}`)
  if (cached) return cached
  const [stats, lineups, events] = await Promise.all([
    client.get(`/fixtures/statistics?fixture=${fixtureId}`),
    client.get(`/fixtures/lineups?fixture=${fixtureId}`),
    client.get(`/fixtures/events?fixture=${fixtureId}`)
  ])
  const result = {
    stats: stats.data.response,
    lineups: lineups.data.response,
    events: events.data.response
  }
  writeCache(`match_${fixtureId}`, result, isFinished)
  return result
}

export async function getRemainingRequests() {
  const { headers } = await client.get('/status')
  return headers['x-ratelimit-remaining'] ?? '?'
}
