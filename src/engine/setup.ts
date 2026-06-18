import type { GameState, Player, Role, Genome, Etat, NightIndicators } from './types'

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function assignRoles(names: string[], enabledRoles: Role[]): GameState {
  const allNames = shuffle([...names])

  // Ordre d'attribution : mutant_base, medecin x2, optionnels, astronautes
  const orderedRoles: Role[] = [
    'mutant_base',
    'medecin',
    'medecin',
    ...enabledRoles,
    ...Array(Math.max(0, allNames.length - 2 - enabledRoles.length - 1)).fill('astronaute' as Role),
  ]

  // Indices des joueurs qui ne sont ni mutant_base ni medecin
  const otherIndices = orderedRoles
    .map((r, i) => (r !== 'mutant_base' && r !== 'medecin' ? i : -1))
    .filter(i => i !== -1)

  const genomeBag: Genome[] = shuffle([
    'hote',
    'resistant',
    ...Array(Math.max(0, otherIndices.length - 2)).fill('normal' as Genome),
  ])

  const players: Player[] = allNames.map((name, i) => {
    const role = orderedRoles[i] ?? 'astronaute'
    let genome: Genome
    let etat: Etat

    if (role === 'mutant_base') {
      genome = 'hote'
      etat = 'mutant'
    } else if (role === 'medecin') {
      genome = 'normal'
      etat = 'sain'
    } else {
      const otherIdx = otherIndices.indexOf(i)
      genome = genomeBag[otherIdx] ?? 'normal'
      etat = 'sain'
    }

    return {
      id: makeId(),
      name,
      role,
      genome,
      etat,
      alive: true,
      isChef: false,
    }
  })

  const emptyNightIndicators: Record<string, NightIndicators> = {}
  players.forEach(p => {
    emptyNightIndicators[p.id] = {
      aOuvertLesYeux: false,
      mute: false,
      paralyse: false,
      soigne: false,
      infecte: false,
      inspectePsy: false,
      inspecteGeneticien: false,
    }
  })

  return {
    players,
    enabledRoles,
    phase: 'distribution',
    nightNumber: 0,
    pendingNight: {
      mutantsMode: null,
      mutantsTarget: null,
      paralyzeTarget: null,
      medecinHeals: [],
      medecinKill: null,
      psyTarget: null,
      geneticienTarget: null,
      espionTarget: null,
      hackerRole: null,
    },
    hackerHistory: [],
    log: [],
    winner: null,
    nightIndicators: emptyNightIndicators,
  }
}
