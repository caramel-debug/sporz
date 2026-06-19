import { useState } from 'react'
import { useGame } from '../../store/gameStore'
import type { NightSummary } from '../../engine'

const PHASE_LABELS: Record<string, string> = {
  distribution: 'Distribution',
  night: 'Nuit',
  day: 'Jour',
}

export default function StatusBar() {
  const { state } = useGame()
  const [historyOpen, setHistoryOpen] = useState(false)

  if (!state || state.phase === 'setup' || state.phase === 'ended') return null

  const alive = state.players.filter(p => p.alive)
  const mutants = alive.filter(p => p.etat === 'mutant').length
  const sains = alive.length - mutants

  const phaseLabel = state.phase === 'distribution'
    ? 'Distribution'
    : `${PHASE_LABELS[state.phase]} ${state.nightNumber}`

  return (
    <>
      <div className="max-w-lg mx-auto px-4 pt-2">
        <div className="flex items-center justify-between text-xs border border-hud-border rounded-sm px-3 py-1.5 bg-hud-panel">
          <span className="text-hud-green font-bold uppercase tracking-wider">{phaseLabel}</span>
          <div className="flex items-center gap-3">
            <span className="text-hud-muted">{alive.length} vivants</span>
            <span className="text-hud-red">{mutants} mut.</span>
            <span className="text-hud-green">{sains} sains</span>
          </div>
          <div className="flex items-center gap-2">
            {state.nightHistory.length > 0 && (
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                className="text-hud-muted hover:text-hud-green transition-colors"
                title="Historique des nuits"
              >
                {historyOpen ? '▾' : '▸'} Hist.
              </button>
            )}
            <span className="text-hud-muted font-mono">#{state.gid}</span>
          </div>
        </div>
      </div>

      {historyOpen && state.nightHistory.length > 0 && (
        <div className="max-w-lg mx-auto px-4 pt-1">
          <div className="border border-hud-border rounded-sm bg-hud-panel p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-hud-green font-bold uppercase tracking-wider">Historique des nuits</span>
              <button onClick={() => setHistoryOpen(false)} className="text-xs text-hud-muted hover:text-hud-red">✕</button>
            </div>
            {[...state.nightHistory].reverse().map((entry: NightSummary) => (
              <div key={entry.nightNumber} className="space-y-1">
                <div className="text-xs text-hud-muted font-bold uppercase">Nuit {entry.nightNumber}</div>
                {entry.events.map((e, i) => (
                  <div key={i} className={`text-xs ${e.color}`}>
                    {e.icon} {e.text}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
