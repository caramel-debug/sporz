import { useGame } from '../../store/gameStore'
import HudPanel from '../shared/HudPanel'

export default function EndScreen() {
  const { state, reset } = useGame()
  if (!state) return null

  const isVictorySains = state.winner === 'sains'

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6 text-center">
      <div className={`text-4xl font-bold tracking-widest uppercase py-6 border rounded-sm ${isVictorySains ? 'border-hud-green text-hud-green' : 'border-hud-red text-hud-red'}`}>
        {isVictorySains ? '✓ VICTOIRE DES SAINS' : '✕ VICTOIRE DES MUTANTS'}
      </div>

      <HudPanel title={`Journal — ${state.nightNumber} nuit(s)`}>
        <ul className="text-left space-y-1 text-xs text-hud-muted max-h-48 overflow-y-auto">
          {state.log.map((entry, i) => (
            <li key={i} className="border-b border-hud-border pb-1">
              {new Date(entry.timestamp).toLocaleTimeString('fr-FR')} — {entry.description}
            </li>
          ))}
        </ul>
      </HudPanel>

      <HudPanel title="Révélation finale">
        <ul className="text-left space-y-1 text-sm">
          {state.players.map(p => (
            <li key={p.id} className="flex justify-between text-hud-muted">
              <span>{p.name}</span>
              <span>{p.role === 'mutant_base' ? 'astronaute*' : p.role} — {p.etat} — {p.genome}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-hud-muted mt-2">* mutant de base annoncé comme astronaute en jeu</p>
      </HudPanel>

      <button
        onClick={reset}
        className="w-full py-3 border border-hud-green text-hud-green font-bold tracking-widest uppercase hover:bg-hud-green hover:text-hud-bg transition-colors rounded-sm"
      >
        ▶ Nouvelle mission
      </button>
    </div>
  )
}
