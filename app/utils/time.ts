export const now = (): number => Date.now()

export const secondsUntil = (timestamp: number | null): number => {
  if (!timestamp) return 0
  return Math.max(0, Math.ceil((timestamp - now()) / 1000))
}

export const formatDuration = (seconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`
}

export const addSeconds = (timestamp: number, seconds: number): number => timestamp + seconds * 1000

export const toSeconds = (timestamp: number): number => Math.floor(timestamp / 1000)

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))
