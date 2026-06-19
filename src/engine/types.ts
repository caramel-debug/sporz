export type Genome = 'normal' | 'resistant' | 'hote'
export type Etat   = 'sain' | 'mutant'
export type Role =
  | 'mutant_base'
  | 'medecin'
  | 'informaticien'
  | 'psychologue'
  | 'geneticien'
  | 'espion'
  | 'hacker'
  | 'astronaute'

export interface Player {
  id: string
  name: string
  role: Role
  genome: Genome
  etat: Etat
  alive: boolean
  isChef: boolean
}

export interface NightActions {
  mutantsMode: 'mutate' | 'kill' | null
  mutantsTarget: string | null
  paralyzeTarget: string | null
  medecinHeals: string[]
  medecinKill: string | null
  psyTarget: string | null
  geneticienTarget: string | null
  espionTarget: string | null
  hackerRole: 'informaticien' | 'psychologue' | 'geneticien' | null
}

export interface NightIndicators {
  aOuvertLesYeux: boolean
  mute: boolean
  paralyse: boolean
  soigne: boolean
  infecte: boolean
  inspectePsy: boolean
  inspecteGeneticien: boolean
}

export type NightReport =
  | { type: 'skip';     role: Role; reason: 'paralysé' | 'mort' | 'absent' | 'muté' }
  | { type: 'info';     role: Role; label: string; result: string }
  | { type: 'consigne'; text: string }
  | { type: 'mutation_echec'; targetId: string; targetName: string }
  | { type: 'soin_echec_hote_mute'; targetId: string; targetName: string }

export type DayReport =
  | { type: 'autopsie'; playerId: string; playerName: string; role: Role; etat: Etat; genome: Genome; publicRole: string }

export type EndResult = 'sains' | 'mutants' | 'imminent' | null

export interface GameEvent {
  timestamp: number
  description: string
}

export interface GameState {
  players: Player[]
  enabledRoles: Role[]
  phase: 'setup' | 'distribution' | 'night' | 'day' | 'ended'
  nightNumber: number
  hackerHistory: Role[]
  log: GameEvent[]
  winner: 'sains' | 'mutants' | null
  nightIndicators: Record<string, NightIndicators>
}
