import { useState } from 'react'
import { useGame } from '../../store/gameStore'
import { encodeToken } from '../../engine'
import HudPanel from '../shared/HudPanel'
import PlayerCard from '../player/PlayerCard'
import type { Player } from '../../engine'

export default function DistributionScreen() {
  const { state, setState } = useGame()
  const [passMode, setPassMode] = useState<'pass' | 'link'>('pass')
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())

  if (!state) return null

  const startNight = () => setState({ ...state, phase: 'night', nightNumber: 1 })

  const revealPlayer = (p: Player) => setRevealedId(p.id)

  const hidePlayer = () => {
    if (revealedId) setDoneIds(prev => new Set([...prev, revealedId]))
    setRevealedId(null)
  }

  const revealed = state.players.find(p => p.id === revealedId)

  // Mode "passe le téléphone" : affiche carte plein écran
  if (revealedId && revealed) {
    const token = {
      n: revealed.name,
      r: revealed.role,
      e: revealed.etat,
      ...(revealed.role === 'mutant_base' ? { h: true as true } : {}),
    }
    return (
      <div className="min-h-screen flex flex-col">
        <PlayerCard token={token} />
        <button
          onClick={hidePlayer}
          className="m-4 py-3 border border-hud-amber text-hud-amber font-bold tracking-widest uppercase hover:bg-hud-amber hover:text-hud-bg transition-colors rounded-sm"
        >
          ✓ Masquer — passer au suivant
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 p-4">
      <h1 className="text-hud-green text-xl font-bold tracking-widest uppercase">
        ⬡ Distribution des rôles
      </h1>

      <div className="flex gap-2">
        {(['pass', 'link'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setPassMode(mode)}
            className={`flex-1 py-2 text-sm border rounded-sm uppercase tracking-wider transition-colors
              ${passMode === mode ? 'border-hud-green bg-hud-green text-hud-bg font-bold' : 'border-hud-border text-hud-muted hover:border-hud-muted'}`}
          >
            {mode === 'pass' ? 'Passe le téléphone' : 'Liens secrets'}
          </button>
        ))}
      </div>

      <HudPanel title="Équipage">
        <ul className="space-y-2">
          {state.players.map(p => {
            const done = doneIds.has(p.id)
            const token = encodeToken({ n: p.name, r: p.role, e: p.etat, ...(p.role === 'mutant_base' ? { h: true } : {}) })
            return (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className={done ? 'text-hud-muted line-through' : 'text-hud-green'}>
                  {p.name}
                </span>
                {passMode === 'pass' ? (
                  <button
                    onClick={() => revealPlayer(p)}
                    disabled={done}
                    className="px-3 py-1 text-xs border border-hud-green text-hud-green hover:bg-hud-green hover:text-hud-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-sm"
                  >
                    {done ? '✓ Lu' : 'Voir son rôle'}
                  </button>
                ) : (
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/#${token}`)}
                    className="px-3 py-1 text-xs border border-hud-blue text-hud-blue hover:bg-hud-blue hover:text-hud-bg transition-colors rounded-sm"
                  >
                    Copier le lien
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </HudPanel>

      <button
        onClick={startNight}
        className="w-full py-3 border border-hud-green text-hud-green font-bold tracking-widest uppercase hover:bg-hud-green hover:text-hud-bg transition-colors rounded-sm"
      >
        ▶ Commencer la nuit 1
      </button>
    </div>
  )
}
