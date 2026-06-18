import type { GameState, DayReport } from './types'
import { getPublicRole } from './night'

export function resolveExecution(
  state: GameState,
  targetId: string | null
): { state: GameState; reports: DayReport[] } {
  const reports: DayReport[] = []
  if (!targetId) return { state, reports }

  const players = state.players.map(p => ({ ...p }))
  const target = players.find(p => p.id === targetId)
  if (!target) return { state, reports }

  target.alive = false

  reports.push({
    type: 'autopsie',
    playerId: target.id,
    playerName: target.name,
    role: target.role,
    etat: target.etat,
    genome: target.genome,
    publicRole: getPublicRole(target),
  })

  const logEntry = { timestamp: Date.now(), description: `Exécution de ${target.name} (${getPublicRole(target)}).` }

  return {
    state: { ...state, players, log: [...state.log, logEntry] },
    reports,
  }
}
