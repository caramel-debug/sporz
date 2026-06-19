import { it, expect } from 'vitest'
import { resolveNight, isHackerRoleAllowed, getPublicRole } from '../night'
import type { GameState, Player, NightActions } from '../types'

// Helper : crée un état minimal de test
function makeState(overrides: Partial<GameState> & { players: Player[] }): GameState {
  const indicators: Record<string, import('../types').NightIndicators> = {}
  overrides.players.forEach(p => {
    indicators[p.id] = {
      aOuvertLesYeux: false, mute: false, paralyse: false,
      soigne: false, infecte: false, inspectePsy: false, inspecteGeneticien: false,
    }
  })
  return {
    enabledRoles: [],
    phase: 'night',
    nightNumber: 1,
    hackerHistory: [],
    log: [],
    winner: null,
    nightIndicators: indicators,
    ...overrides,
  }
}

function emptyActions(): NightActions {
  return {
    mutantsMode: null, mutantsTarget: null, paralyzeTarget: null,
    medecinHeals: [], medecinKill: null,
    psyTarget: null, geneticienTarget: null, espionTarget: null, hackerRole: null,
  }
}

function p(id: string, role: import('../types').Role, genome: import('../types').Genome = 'normal', etat: import('../types').Etat = 'sain'): Player {
  return { id, name: id, role, genome, etat, alive: true, isChef: false }
}

// CAS 1 : Mutation sur un résistant → aucun changement d'état, indicateur "a appris son génome"
it('CAS 1 : mutation sur résistant échoue, apprend son génome', () => {
  const resistant = p('r1', 'astronaute', 'resistant')
  const mutant = p('m1', 'mutant_base', 'hote', 'mutant')
  const state = makeState({ players: [mutant, resistant] })
  const actions: NightActions = { ...emptyActions(), mutantsMode: 'mutate', mutantsTarget: 'r1' }
  const { state: next, reports } = resolveNight(state, actions)
  const r1 = next.players.find(p => p.id === 'r1')!
  expect(r1.etat).toBe('sain')
  expect(reports.some(r => r.type === 'mutation_echec')).toBe(true)
})

// CAS 2 : Soin sur un mutant hôte → aucune guérison, indicateur remonté
it('CAS 2 : soin sur mutant hôte échoue, apprend son génome', () => {
  const mutantHote = p('mh', 'astronaute', 'hote', 'mutant')
  const medecin1 = p('med1', 'medecin', 'normal', 'sain')
  const base = p('m1', 'mutant_base', 'hote', 'mutant')
  const state = makeState({ players: [base, medecin1, mutantHote] })
  const actions: NightActions = { ...emptyActions(), medecinHeals: ['mh'] }
  const { state: next, reports } = resolveNight(state, actions)
  const mh = next.players.find(p => p.id === 'mh')!
  expect(mh.etat).toBe('mutant')
  expect(reports.some(r => r.type === 'soin_echec_hote_mute')).toBe(true)
})

// CAS 3 : Soin sur un mutant normal → retour à sain
it('CAS 3 : soin sur mutant normal → retour à sain', () => {
  const mutantNormal = p('mn', 'astronaute', 'normal', 'mutant')
  const medecin1 = p('med1', 'medecin', 'normal', 'sain')
  const base = p('m1', 'mutant_base', 'hote', 'mutant')
  const state = makeState({ players: [base, medecin1, mutantNormal] })
  const actions: NightActions = { ...emptyActions(), medecinHeals: ['mn'] }
  const { state: next } = resolveNight(state, actions)
  expect(next.players.find(p => p.id === 'mn')!.etat).toBe('sain')
})

// CAS 4 : Médecin muté → ne se réveille pas ; consigne "mimer"
it('CAS 4 : médecin muté ne se réveille pas, consigne mimer', () => {
  const muteMed = p('med1', 'medecin', 'normal', 'mutant')
  const soinMed = p('med2', 'medecin', 'normal', 'sain')
  const base = p('m1', 'mutant_base', 'hote', 'mutant')
  const target = p('t1', 'astronaute')
  const state = makeState({ players: [base, muteMed, soinMed, target] })
  const actions: NightActions = { ...emptyActions(), medecinHeals: ['t1'] }
  const { reports } = resolveNight(state, actions)
  expect(reports.some(r => r.type === 'skip' && r.role === 'medecin' && r.reason === 'muté')).toBe(true)
  expect(reports.some(r => r.type === 'consigne' && r.text.toLowerCase().includes('mim'))).toBe(true)
})

// CAS 5 : Les deux médecins indisponibles → aucune action médecin
it('CAS 5 : deux médecins morts → aucune action médecin possible', () => {
  const deadMed1 = { ...p('med1', 'medecin'), alive: false }
  const deadMed2 = { ...p('med2', 'medecin'), alive: false }
  const base = p('m1', 'mutant_base', 'hote', 'mutant')
  const target = p('t1', 'astronaute')
  const state = makeState({ players: [base, deadMed1, deadMed2, target] })
  const actions: NightActions = { ...emptyActions() }
  const { state: next } = resolveNight(state, actions)
  // target reste inchangé
  expect(next.players.find(p => p.id === 't1')!.etat).toBe('sain')
})

// CAS 6 : Informaticien — compte APRÈS mutations et soins
it('CAS 6 : informaticien compte mutants après résolution complète', () => {
  const info = p('info1', 'informaticien')
  const base = p('m1', 'mutant_base', 'hote', 'mutant')
  const cible = p('c1', 'astronaute', 'normal', 'sain')
  const medecin = p('med1', 'medecin')
  const state = makeState({ players: [base, medecin, info, cible], enabledRoles: ['informaticien'] })
  // mutants mutent c1 ; médecin soigne c1 → c1 reste sain → 1 mutant (base)
  const actions: NightActions = {
    ...emptyActions(),
    mutantsMode: 'mutate', mutantsTarget: 'c1',
    medecinHeals: ['c1'],
    psyTarget: null, geneticienTarget: null,
  }
  const { reports } = resolveNight(state, actions)
  const infoReport = reports.find(r => r.type === 'info' && r.role === 'informaticien')
  expect(infoReport).toBeDefined()
  if (infoReport && infoReport.type === 'info') {
    expect(infoReport.result).toContain('1')
  }
})

// CAS 7 : Nouveau mutant n'agit pas la nuit de sa mutation
it('CAS 7 : joueur muté cette nuit n\'agit pas avec les mutants', () => {
  const base = p('m1', 'mutant_base', 'hote', 'mutant')
  const futurMutant = p('fm', 'astronaute', 'normal', 'sain')
  const medecin = p('med1', 'medecin')
  const victim = p('v1', 'astronaute')
  const state = makeState({ players: [base, medecin, futurMutant, victim] })
  // mutants mutent futurMutant
  const actions: NightActions = { ...emptyActions(), mutantsMode: 'mutate', mutantsTarget: 'fm' }
  const { state: next } = resolveNight(state, actions)
  const fm = next.players.find(p => p.id === 'fm')!
  expect(fm.etat).toBe('mutant')
  // Vérifier que le nightIndicator indique qu'il vient d'être muté (ne participera qu'à la nuit suivante)
  expect(next.nightIndicators['fm'].mute).toBe(true)
})

// CAS 8 : Hacker — répétition d'un rôle interdit (testé via la fonction de validation)
it('CAS 8 : hackerHistory bloque la répétition tant que les autres rôles vivants n\'ont pas été piratés', () => {
  // A piraté info ; psy et géné sont vivants → ne peut pas repirater info
  expect(isHackerRoleAllowed('informaticien', ['informaticien'], ['informaticien', 'psychologue', 'geneticien'])).toBe(false)
  // A piraté info et psy ; géné vivant → ne peut pas repirater info ni psy
  expect(isHackerRoleAllowed('psychologue', ['informaticien', 'psychologue'], ['informaticien', 'psychologue', 'geneticien'])).toBe(false)
  // A piraté info, psy, géné → cycle complet, peut repirater info
  expect(isHackerRoleAllowed('informaticien', ['informaticien', 'psychologue', 'geneticien'], ['informaticien', 'psychologue', 'geneticien'])).toBe(true)
})

// CAS 9 : Hacker sur rôle paralysé → aucune information
it('CAS 9 : hacker sur rôle dont le détenteur est paralysé → aucune information', () => {
  const base = p('m1', 'mutant_base', 'hote', 'mutant')
  const hacker = p('h1', 'hacker')
  const infoParalyse = p('info1', 'informaticien')
  const medecin = p('med1', 'medecin')
  const state = makeState({
    players: [base, medecin, hacker, infoParalyse],
    enabledRoles: ['informaticien', 'hacker'],
  })
  // Paralyser l'informaticien
  const actions: NightActions = {
    ...emptyActions(),
    paralyzeTarget: 'info1',
    hackerRole: 'informaticien',
  }
  const { reports } = resolveNight(state, actions)
  const hackerReport = reports.find(r => r.type === 'info' && r.role === 'hacker')
  expect(hackerReport).toBeDefined()
  if (hackerReport && hackerReport.type === 'info') {
    expect(hackerReport.result.toLowerCase()).toContain('aucune')
  }
})

// CAS 10 : Mutant de base exécuté → annoncé "astronaute, mutant, hôte"
it('CAS 10 : mutant_base autopsié → rôle public = astronaute', () => {
  expect(getPublicRole({ role: 'mutant_base', etat: 'mutant', genome: 'hote' } as Player)).toBe('astronaute')
})

// CAS 11 : Espion — checklist reflète les événements de la nuit
it('CAS 11 : espion reflète les événements de la nuit de la cible', () => {
  const base = p('m1', 'mutant_base', 'hote', 'mutant')
  const espion = p('esp1', 'espion')
  const cible = p('c1', 'astronaute', 'normal', 'sain')
  const medecin = p('med1', 'medecin')
  const state = makeState({ players: [base, medecin, espion, cible], enabledRoles: ['espion'] })
  // Mutants tentent de muter c1, médecin soigne c1
  const actions: NightActions = {
    ...emptyActions(),
    mutantsMode: 'mutate', mutantsTarget: 'c1',
    medecinHeals: ['c1'],
    espionTarget: 'c1',
  }
  const { reports } = resolveNight(state, actions)
  const espionReport = reports.find(r => r.type === 'info' && r.role === 'espion')
  expect(espionReport).toBeDefined()
  if (espionReport && espionReport.type === 'info') {
    expect(espionReport.result).toMatch(/soigné/i)
  }
})

// CAS 12 : Fin de partie détectée (testé dans endCondition.test.ts)

// CAS 13 : Paralysie non soignable
it('CAS 13 : un joueur paralysé reste paralysé même soigné', () => {
  const base = p('m1', 'mutant_base', 'hote', 'mutant')
  const cible = p('c1', 'astronaute')
  const medecin = p('med1', 'medecin')
  const state = makeState({ players: [base, medecin, cible] })
  const actions: NightActions = {
    ...emptyActions(),
    paralyzeTarget: 'c1',
    medecinHeals: ['c1'],
  }
  const { state: next } = resolveNight(state, actions)
  expect(next.nightIndicators['c1'].paralyse).toBe(true)
})

// CAS 14 : Rafraîchissement (testé dans gameStore.test.ts)
