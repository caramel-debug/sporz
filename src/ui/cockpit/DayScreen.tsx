import { useState } from 'react'
import { useGame } from '../../store/gameStore'
import { resolveExecution, checkEnd } from '../../engine'
import HudPanel from '../shared/HudPanel'
import PlayerList from '../shared/PlayerList'

export default function DayScreen() {
  const { state, setState } = useGame()
  const [selectedVote, setSelectedVote] = useState<string | 'blanc' | null>(null)

  if (!state) return null

  const execute = () => {
    if (!selectedVote) return
    const targetId = selectedVote === 'blanc' ? null : selectedVote
    const { state: nextState } = resolveExecution(state, targetId)
    const endResult = checkEnd(nextState)
    const finalState = endResult === 'sains' || endResult === 'mutants'
      ? { ...nextState, phase: 'ended' as const, winner: endResult }
      : nextState
    setState(finalState)
  }

  const nextNight = () => {
    setState({
      ...state,
      phase: 'night',
      nightNumber: state.nightNumber + 1,
      pendingNight: {
        mutantsMode: null, mutantsTarget: null, paralyzeTarget: null,
        medecinHeals: [], medecinKill: null,
        psyTarget: null, geneticienTarget: null, espionTarget: null, hackerRole: null,
      },
    })
  }

  const livePlayers = state.players.filter(p => p.alive)

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h1 className="text-hud-amber text-xl font-bold tracking-widest uppercase">
        ☀ Jour {state.nightNumber}
      </h1>

      <HudPanel title="Tableau de bord OdB">
        <PlayerList players={state.players} showSecrets />
      </HudPanel>

      <HudPanel title="Vote — Qui exécuter ?">
        <PlayerList
          players={livePlayers}
          onSelect={id => setSelectedVote(id)}
          selectedIds={selectedVote && selectedVote !== 'blanc' ? [selectedVote] : []}
        />
        <button
          onClick={() => setSelectedVote('blanc')}
          className={`mt-3 w-full py-2 text-sm border rounded-sm transition-colors
            ${selectedVote === 'blanc' ? 'border-hud-blue bg-hud-blue/10 text-hud-blue' : 'border-hud-border text-hud-muted hover:border-hud-muted'}`}
        >
          ○ Vote blanc (personne n'est exécuté)
        </button>
      </HudPanel>

      <button
        onClick={execute}
        disabled={!selectedVote}
        className="w-full py-3 border border-hud-red text-hud-red font-bold tracking-widest uppercase hover:bg-hud-red hover:text-hud-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-sm"
      >
        ▶ Exécuter
      </button>

      <button
        onClick={nextNight}
        className="w-full py-3 border border-hud-green text-hud-green font-bold tracking-widest uppercase hover:bg-hud-green hover:text-hud-bg transition-colors rounded-sm"
      >
        ▶ Nuit suivante
      </button>
    </div>
  )
}
