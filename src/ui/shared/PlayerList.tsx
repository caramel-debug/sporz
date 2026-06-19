import type { Player } from '../../engine'
import StatusBadge from './StatusBadge'

interface PlayerListProps {
  players: Player[]
  showSecrets?: boolean  // true = mode OdB (rôle/état/génome réels)
  onSelect?: (id: string) => void
  selectedIds?: string[]
  paralyzedIds?: string[]
}

export default function PlayerList({ players, showSecrets = false, onSelect, selectedIds = [], paralyzedIds = [] }: PlayerListProps) {
  return (
    <ul className="space-y-1">
      {players.map(p => (
        <li
          key={p.id}
          onClick={() => onSelect?.(p.id)}
          className={`flex items-center justify-between p-2 rounded-sm border text-sm transition-colors
            ${onSelect ? 'cursor-pointer' : ''}
            ${!p.alive ? 'opacity-40 border-hud-muted' : selectedIds.includes(p.id) ? 'border-hud-green bg-hud-green/10' : 'border-hud-border hover:border-hud-muted'}`}
        >
          <span className={p.isChef ? 'text-hud-amber' : ''}>
            {p.isChef ? '★ ' : ''}{p.name}
          </span>
          <div className="flex gap-2 items-center">
            {showSecrets && (
              <span className="text-hud-muted text-xs">{p.role}</span>
            )}
            <StatusBadge etat={p.etat} genome={showSecrets ? p.genome : undefined} alive={p.alive} paralyzed={paralyzedIds.includes(p.id)} />
          </div>
        </li>
      ))}
    </ul>
  )
}
