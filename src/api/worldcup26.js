import axios from 'axios'

const client = axios.create({ 
  baseURL: 'https://worldcup26.ir',
  timeout: 15000
})

export async function getFallbackFixtures() {
  try {
    const { data } = await client.get('/get/games')
    return data.games || []
  } catch (err) {
    console.warn('worldcup26.ir games failed:', err.message)
    return []
  }
}

export async function getFallbackGroups() {
  try {
    const { data } = await client.get('/get/groups')
    return data.groups || data || []
  } catch (err) {
    console.warn('worldcup26.ir groups failed:', err.message)
    return []
  }
}

export async function getFallbackTeams() {
  try {
    const { data } = await client.get('/get/teams')
    return data.teams || data || []
  } catch (err) {
    console.warn('worldcup26.ir teams failed:', err.message)
    return []
  }
}
