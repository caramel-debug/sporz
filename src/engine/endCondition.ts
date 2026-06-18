import type { GameState, EndResult } from './types'

export function checkEnd(state: GameState): EndResult {
  const alive = state.players.filter(p => p.alive)
  if (alive.length === 0) return 'sains'

  const mutants = alive.filter(p => p.etat === 'mutant')
  const sains   = alive.filter(p => p.etat === 'sain')

  if (mutants.length === 0) return 'sains'
  if (sains.length === 0)   return 'mutants'

  // Victoire imminente : médecins vivants tous mutés ET mutants majoritaires
  const medecinVivants = alive.filter(p => p.role === 'medecin')
  const medecinsSains  = medecinVivants.filter(p => p.etat === 'sain')
  if (medecinsSains.length === 0 && mutants.length > sains.length) {
    return 'imminent'
  }

  return null
}
