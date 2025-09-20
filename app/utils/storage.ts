const STORAGE_KEYS = {
  profile: 'battle.profile',
  mapPanel: 'battle.mapPanel',
} as const

export const loadJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch (error) {
    console.warn('Failed to load localStorage key', key, error)
    return fallback
  }
}

export const saveJson = (key: string, value: unknown): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn('Failed to persist localStorage key', key, error)
  }
}

export { STORAGE_KEYS }
