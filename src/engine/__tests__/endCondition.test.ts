import { describe, it, expect } from 'vitest'
import { checkEnd } from '../endCondition'
import { resolveExecution } from '../day'
import type { GameState, Player } from '../types'

function p(id: string, etat: 'sain' | 'mutant', role: import('../types').Role = 'astronaute', alive = true): Player {
  return { id, name: id, role, genome: 'normal', etat, alive, isChef: false }
}

function makeState(players: Player[]): GameState {
  const indicators: Record<string, import('../types').NightIndicators> = {}
  players.forEach(p => {
    indicators[p.id] = { aOuvertLesYeux:false, mute:false, paralyse:false, soigne:false, infecte:false, inspectePsy:false, inspecteGeneticien:false }
  })
  return {
    players, enabledRoles: [], phase: 'day', nightNumber: 1,
    pendingNight: { mutantsMode:null, mutantsTarget:null, paralyzeTarget:null, medecinHeals:[], medecinKill:null, psyTarget:null, geneticienTarget:null, espionTarget:null, hackerRole:null },
    hackerHistory: [], log: [], winner: null, nightIndicators: indicators,
  }
}

// CAS 12a : victoire des sains
it('CAS 12a : victoire sains quand aucun mutant vivant', () => {
  const state = makeState([p('s1','sain'), p('s2','sain'), p('m1','mutant','astronaute',false)])
  expect(checkEnd(state)).toBe('sains')
})

// CAS 12b : victoire des mutants
it('CAS 12b : victoire mutants quand tous les vivants sont mutants', () => {
  const state = makeState([p('m1','mutant'), p('m2','mutant'), p('s1','sain','astronaute',false)])
  expect(checkEnd(state)).toBe('mutants')
})

// CAS 12c : victoire imminente
it('CAS 12c : imminente si médecins tous morts/mutés ET mutants majoritaires', () => {
  const state = makeState([
    p('m1','mutant'),
    p('m2','mutant'),
    p('s1','sain'),
    { ...p('med1','mutant'), role: 'medecin' as import('../types').Role },
    { ...p('med2','sain'), alive: false, role: 'medecin' as import('../types').Role },
  ])
  expect(checkEnd(state)).toBe('imminent')
})

// CAS 10 via resolveExecution : mutant_base autopsiée → publicRole = astronaute
it('CAS 10 : autopsie mutant_base → rôle public astronaute', () => {
  const base = { ...p('m1','mutant','mutant_base'), genome: 'hote' as import('../types').Genome }
  const state = makeState([base, p('s1','sain')])
  const { reports } = resolveExecution(state, 'm1')
  const autopsie = reports.find(r => r.type === 'autopsie')!
  expect(autopsie.publicRole).toBe('astronaute')
})
