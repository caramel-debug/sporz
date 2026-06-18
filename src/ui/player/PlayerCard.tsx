import type { PlayerToken } from '../../engine'

export default function PlayerCard({ token }: { token: PlayerToken }) {
  return <div className="p-4 text-hud-green">Carte joueur — {token.n}</div>
}
