export interface PlayerToken {
  n: string   // nom
  r: string   // role
  e: string   // etat
  h?: true    // hote (mutant_base seulement)
  g?: string  // gid (identifiant de partie)
}

export function encodeToken(token: PlayerToken): string {
  const bytes = new TextEncoder().encode(JSON.stringify(token))
  const binary = Array.from(bytes, b => String.fromCharCode(b)).join('')
  return btoa(binary)
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function decodeToken(raw: string): PlayerToken | null {
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - raw.length % 4) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as PlayerToken
  } catch {
    return null
  }
}
