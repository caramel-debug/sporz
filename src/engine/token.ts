export interface PlayerToken {
  n: string   // nom
  r: string   // role
  e: string   // etat
  h?: true    // hote (mutant_base seulement)
}

export function encodeToken(token: PlayerToken): string {
  return btoa(JSON.stringify(token))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function decodeToken(raw: string): PlayerToken | null {
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - raw.length % 4) % 4)
    return JSON.parse(atob(padded)) as PlayerToken
  } catch {
    return null
  }
}
