import type { Etat, Genome } from '../../engine'

interface StatusBadgeProps {
  etat?: Etat
  genome?: Genome
  alive?: boolean
  paralyzed?: boolean
}

export default function StatusBadge({ etat, genome, alive = true, paralyzed = false }: StatusBadgeProps) {
  if (!alive) return <span className="text-xs text-hud-muted px-2 py-0.5 border border-hud-muted rounded-sm">MORT</span>
  if (paralyzed) return <span className="text-xs text-hud-amber px-2 py-0.5 border border-hud-amber rounded-sm">PARALYSÉ</span>
  if (etat === 'mutant') return <span className="text-xs text-hud-red px-2 py-0.5 border border-hud-red rounded-sm">MUTANT</span>
  if (genome === 'resistant') return <span className="text-xs text-hud-blue px-2 py-0.5 border border-hud-blue rounded-sm">RÉSISTANT</span>
  if (genome === 'hote') return <span className="text-xs text-hud-amber px-2 py-0.5 border border-hud-amber rounded-sm">HÔTE</span>
  return <span className="text-xs text-hud-green px-2 py-0.5 border border-hud-green rounded-sm">SAIN</span>
}
