import { useState, useEffect, useRef, useCallback } from 'react'
import { useGame } from '../../store/gameStore'
import { resolveExecution, checkEnd } from '../../engine'
import type { DayReport } from '../../engine'
import HudPanel from '../shared/HudPanel'
import PlayerList from '../shared/PlayerList'

type DayPhase = 'chef' | 'discussion' | 'vote' | 'autopsie' | 'done'

export default function DayScreen() {
  const { state, setState } = useGame()
  const [selectedVote, setSelectedVote] = useState<string | 'blanc' | null>(null)
  const [selectedChef, setSelectedChef] = useState<string | null>(null)
  const [autopsieReports, setAutopsieReports] = useState<DayReport[] | null>(null)
  const [dayPhase, setDayPhase] = useState<DayPhase>(() => {
    if (!state) return 'discussion'
    const hasChef = state.players.some(p => p.isChef && p.alive)
    return hasChef ? 'discussion' : 'chef'
  })

  if (!state) return null

  const livePlayers = state.players.filter(p => p.alive)

  const confirmChef = () => {
    if (!selectedChef) return
    const updatedPlayers = state.players.map(p => ({
      ...p,
      isChef: p.id === selectedChef,
    }))
    setState({ ...state, players: updatedPlayers })
    setDayPhase('discussion')
  }

  const skipChef = () => setDayPhase('discussion')

  const execute = () => {
    if (!selectedVote) return
    const targetId = selectedVote === 'blanc' ? null : selectedVote
    const { state: nextState, reports } = resolveExecution(state, targetId)
    const endResult = checkEnd(nextState)
    const finalState = endResult === 'sains' || endResult === 'mutants'
      ? { ...nextState, phase: 'ended' as const, winner: endResult }
      : nextState

    if (reports.length > 0) {
      setAutopsieReports(reports)
      setState(finalState)
      setDayPhase('autopsie')
    } else {
      // Vote blanc
      setState(finalState)
      setDayPhase('done')
    }
  }

  const nextNight = () => {
    setState({
      ...state,
      phase: 'night' as const,
      nightNumber: state.nightNumber + 1,
    })
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h1 className="text-hud-amber text-xl font-bold tracking-widest uppercase">
        ☀ Jour {state.nightNumber}
      </h1>

      <HudPanel title="Tableau de bord OdB">
        <PlayerList players={state.players} showSecrets />
      </HudPanel>

      {dayPhase === 'chef' && (
        <HudPanel title="Élection du Capitaine">
          <p className="text-xs text-hud-muted mb-2">Désignez le capitaine de vaisseau (vote double lors des exécutions) :</p>
          <PlayerList
            players={livePlayers}
            onSelect={id => setSelectedChef(selectedChef === id ? null : id)}
            selectedIds={selectedChef ? [selectedChef] : []}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={skipChef}
              className="flex-1 py-2 text-sm border border-hud-muted text-hud-muted hover:border-hud-green hover:text-hud-green transition-colors rounded-sm"
            >
              Passer
            </button>
            <button
              onClick={confirmChef}
              disabled={!selectedChef}
              className="flex-1 py-2 text-sm border border-hud-green text-hud-green font-bold hover:bg-hud-green hover:text-hud-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-sm"
            >
              ★ Élire capitaine
            </button>
          </div>
        </HudPanel>
      )}

      {dayPhase === 'discussion' && (
        <>
          <HudPanel title="Phase de discussion">
            <DiscussionTimer />
          </HudPanel>
          <button
            onClick={() => setDayPhase('vote')}
            className="w-full py-3 border border-hud-amber text-hud-amber font-bold tracking-widest uppercase hover:bg-hud-amber hover:text-hud-bg transition-colors rounded-sm"
          >
            ▶ Passer au vote
          </button>
        </>
      )}

      {dayPhase === 'vote' && (
        <>
          <HudPanel title="Vote — Qui exécuter ?">
            <PlayerList
              players={livePlayers}
              onSelect={id => setSelectedVote(selectedVote === id ? null : id)}
              selectedIds={selectedVote && selectedVote !== 'blanc' ? [selectedVote] : []}
            />
            <button
              onClick={() => setSelectedVote(selectedVote === 'blanc' ? null : 'blanc')}
              className={`mt-3 w-full py-2 text-sm border rounded-sm transition-colors
                ${selectedVote === 'blanc' ? 'border-hud-blue bg-hud-blue/10 text-hud-blue' : 'border-hud-border text-hud-muted hover:border-hud-muted'}`}
            >
              ○ Vote blanc (personne n'est exécuté)
            </button>
          </HudPanel>

          <div className="flex gap-2">
            <button
              onClick={() => setDayPhase('discussion')}
              className="flex-1 py-2 border border-hud-muted text-hud-muted hover:border-hud-green hover:text-hud-green transition-colors rounded-sm text-sm"
            >
              ← Retour
            </button>
            <button
              onClick={execute}
              disabled={!selectedVote}
              className="flex-1 py-3 border border-hud-red text-hud-red font-bold tracking-widest uppercase hover:bg-hud-red hover:text-hud-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-sm"
            >
              ▶ Exécuter
            </button>
          </div>
        </>
      )}

      {dayPhase === 'autopsie' && autopsieReports && (
        <>
          <HudPanel title="Autopsie">
            {autopsieReports.map((r, i) => (
              <div key={i} className="border border-hud-red bg-hud-red/5 p-3 rounded-sm text-sm space-y-1">
                <div className="text-hud-red font-bold">{r.playerName} — exécuté·e</div>
                <div className="text-hud-muted">Rôle annoncé : <span className="text-hud-green">{r.publicRole}</span></div>
                <div className="text-hud-muted">État : <span className={r.etat === 'mutant' ? 'text-hud-red' : 'text-hud-green'}>{r.etat.toUpperCase()}</span></div>
                <div className="text-hud-muted">Génome : <span className="text-hud-blue">{r.genome.toUpperCase()}</span></div>
              </div>
            ))}
          </HudPanel>
          <button
            onClick={() => setDayPhase('done')}
            className="w-full py-3 border border-hud-green text-hud-green font-bold tracking-widest uppercase hover:bg-hud-green hover:text-hud-bg transition-colors rounded-sm"
          >
            Continuer →
          </button>
        </>
      )}

      {dayPhase === 'done' && (
        <button
          onClick={nextNight}
          className="w-full py-3 border border-hud-green text-hud-green font-bold tracking-widest uppercase hover:bg-hud-green hover:text-hud-bg transition-colors rounded-sm"
        >
          ▶ Nuit suivante
        </button>
      )}
    </div>
  )
}

const TIMER_PRESETS = [
  { label: '3 min', seconds: 3 * 60 },
  { label: '5 min', seconds: 5 * 60 },
  { label: '7 min', seconds: 7 * 60 },
  { label: '10 min', seconds: 10 * 60 },
]

function DiscussionTimer() {
  const [totalSeconds, setTotalSeconds] = useState(5 * 60)
  const [remaining, setRemaining] = useState(5 * 60)
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            stop()
            setRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return stop
  }, [running, stop])

  const toggle = () => {
    if (!started) setStarted(true)
    setRunning(r => !r)
  }

  const reset = () => {
    stop()
    setRunning(false)
    setStarted(false)
    setRemaining(totalSeconds)
  }

  const selectPreset = (seconds: number) => {
    stop()
    setRunning(false)
    setStarted(false)
    setTotalSeconds(seconds)
    setRemaining(seconds)
  }

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const pct = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0
  const isExpired = remaining === 0 && started

  return (
    <div className="space-y-3">
      {!started && (
        <div className="flex gap-1">
          {TIMER_PRESETS.map(p => (
            <button key={p.seconds} onClick={() => selectPreset(p.seconds)}
              className={`flex-1 py-1 text-xs border rounded-sm transition-colors
                ${totalSeconds === p.seconds ? 'border-hud-green text-hud-green' : 'border-hud-border text-hud-muted hover:border-hud-muted'}`}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative h-2 bg-hud-border rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 rounded-full ${isExpired ? 'bg-hud-red' : pct < 20 ? 'bg-hud-amber' : 'bg-hud-green'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-3xl font-bold font-mono ${isExpired ? 'text-hud-red animate-pulse' : remaining <= 30 ? 'text-hud-amber' : 'text-hud-green'}`}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
        <div className="flex gap-2">
          <button onClick={toggle}
            className={`px-3 py-1 text-sm border rounded-sm transition-colors
              ${running ? 'border-hud-amber text-hud-amber' : 'border-hud-green text-hud-green'}`}>
            {running ? '⏸ Pause' : isExpired ? '▶ Relancer' : '▶ Démarrer'}
          </button>
          {started && (
            <button onClick={reset}
              className="px-3 py-1 text-sm border border-hud-muted text-hud-muted hover:border-hud-red hover:text-hud-red rounded-sm transition-colors">
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {isExpired && (
        <p className="text-hud-red text-sm font-bold text-center">Temps écoulé — passez au vote !</p>
      )}
    </div>
  )
}
