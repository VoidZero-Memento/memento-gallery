import type { GatePayload } from '../types/gallery.types'

const SESSION_KEY = 'memento.gate.v1'

export const saveGateSession = (payload: GatePayload) => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload))
}

export const loadGateSession = (): GatePayload | null => {
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as GatePayload
    if (
      typeof parsed.spaceName === 'string' &&
      typeof parsed.count === 'number' &&
      Array.isArray(parsed.excludes)
    ) {
      return parsed
    }
  } catch {
    /* ignore */
  }
  return null
}

export const clearGateSession = () => {
  sessionStorage.removeItem(SESSION_KEY)
}
