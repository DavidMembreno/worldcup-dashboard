const CACHE_PREFIX = 'wc26_'

export function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const { data, fetchedAt, isFinished } = JSON.parse(raw)
    if (isFinished) return data
    if (Date.now() - fetchedAt < 5 * 60 * 1000) return data
    return null
  } catch {
    return null
  }
}

export function writeCache(key, data, isFinished = false) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
      data,
      fetchedAt: Date.now(),
      isFinished
    }))
  } catch {
    console.warn('Cache write failed')
  }
}

export function clearCache() {
  Object.keys(localStorage)
    .filter(k => k.startsWith(CACHE_PREFIX))
    .forEach(k => localStorage.removeItem(k))
}
