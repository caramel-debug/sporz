import type {
  GameState, NightActions, NightReport, NightSummaryEvent, Player, Role, NightIndicators
} from './types'

// ─── Helpers publics (exportés pour les tests CAS 8 & 10) ────────────────────

export function getPublicRole(player: Pick<Player, 'role'>): string {
  return player.role === 'mutant_base' ? 'astronaute' : player.role
}

export function isHackerRoleAllowed(
  role: Role,
  history: Role[],
  livingInfoRoles: Role[]
): boolean {
  // Roles non piratés depuis le début du cycle courant
  const notYetHacked = livingInfoRoles.filter(r => !history.includes(r))
  if (notYetHacked.length === 0) {
    // Cycle complet → reset implicite, tout est permis
    return true
  }
  // Interdit si déjà piraté et qu'il reste des non-piratés
  return !history.includes(role)
}

// ─── Résolution nuit ─────────────────────────────────────────────────────────

export function resolveNight(
  state: GameState,
  actions: NightActions
): { state: GameState; reports: NightReport[] } {
  const reports: NightReport[] = []

  // Clone profond des joueurs
  let players = state.players.map(p => ({ ...p }))
  const getPlayer = (id: string) => players.find(p => p.id === id)!

  // Réinitialiser les indicateurs de nuit
  const indicators: Record<string, NightIndicators> = {}
  players.forEach(p => {
    indicators[p.id] = {
      aOuvertLesYeux: false, mute: false, paralyse: false,
      soigne: false, infecte: false, inspectePsy: false, inspecteGeneticien: false,
    }
  })

  // ── ÉTAPE 1 : Mutants ───────────────────────────────────────────────────────
  const { mutantsMode, mutantsTarget, paralyzeTarget } = actions

  // Paralysie (traitée avant le reste pour bloquer les rôles)
  if (paralyzeTarget) {
    const target = getPlayer(paralyzeTarget)
    if (target && target.alive) {
      indicators[paralyzeTarget].paralyse = true
    }
  }

  // Mutation ou meurtre
  if (mutantsMode === 'mutate' && mutantsTarget) {
    const target = getPlayer(mutantsTarget)
    if (target && target.alive) {
      if (target.genome === 'resistant') {
        // Mutation échoue
        reports.push({ type: 'mutation_echec', targetId: target.id, targetName: target.name })
      } else {
        target.etat = 'mutant'
        indicators[mutantsTarget].infecte = true
        indicators[mutantsTarget].mute = true
      }
    }
  } else if (mutantsMode === 'kill' && mutantsTarget) {
    const target = getPlayer(mutantsTarget)
    if (target && target.alive) {
      target.alive = false
    }
  }

  // ── ÉTAPE 2 : Médecins ──────────────────────────────────────────────────────
  const medecins = players.filter(p => p.role === 'medecin')
  const endormis = medecins.filter(m => m.alive && (m.etat === 'mutant' || indicators[m.id].paralyse))

  endormis.forEach(m => {
    const reason = m.etat === 'mutant' ? 'muté' : 'paralysé'
    reports.push({ type: 'skip', role: 'medecin', reason })
    reports.push({ type: 'consigne', text: `Médecin (${m.name}) ${reason} — ne se réveille pas, mimer l'action.` })
  })

  // Soins — uniquement si au moins un médecin est éveillé
  const awakeMedecins = medecins.filter(m => m.alive && m.etat !== 'mutant' && !indicators[m.id].paralyse)
  if (awakeMedecins.length > 0) {
    if (actions.medecinKill) {
      const target = getPlayer(actions.medecinKill)
      if (target && target.alive) target.alive = false
    } else {
      for (const healId of actions.medecinHeals) {
        const target = getPlayer(healId)
        if (!target || !target.alive) continue
        if (target.etat === 'mutant' && target.genome === 'hote') {
          // Insoignable — apprend son génome
          reports.push({ type: 'soin_echec_hote_mute', targetId: target.id, targetName: target.name })
        } else if (target.etat === 'mutant') {
          target.etat = 'sain'
          indicators[healId].soigne = true
        } else {
          indicators[healId].soigne = true
          // Sain soigné → rien de particulier (hôte sain soigné = toucher simple, pas de révélation)
        }
      }
    }
  }

  // ── ÉTAPE 3 : Informaticien ─────────────────────────────────────────────────
  if (state.enabledRoles.includes('informaticien')) {
    const info = players.find(p => p.role === 'informaticien')
    if (!info || !info.alive) {
      reports.push({ type: 'skip', role: 'informaticien', reason: 'mort' })
    } else if (indicators[info.id].paralyse) {
      reports.push({ type: 'skip', role: 'informaticien', reason: 'paralysé' })
    } else {
      indicators[info.id].aOuvertLesYeux = true
      const mutantCount = players.filter(p => p.alive && p.etat === 'mutant').length
      reports.push({ type: 'info', role: 'informaticien', label: 'Nombre de mutants vivants', result: String(mutantCount) })
    }
  }

  // ── ÉTAPE 4 : Psychologue ───────────────────────────────────────────────────
  if (state.enabledRoles.includes('psychologue') && actions.psyTarget) {
    const psy = players.find(p => p.role === 'psychologue')
    if (!psy || !psy.alive) {
      reports.push({ type: 'skip', role: 'psychologue', reason: 'mort' })
    } else if (indicators[psy.id].paralyse) {
      reports.push({ type: 'skip', role: 'psychologue', reason: 'paralysé' })
    } else {
      indicators[psy.id].aOuvertLesYeux = true
      const target = getPlayer(actions.psyTarget)
      if (!target.alive) {
        reports.push({ type: 'info', role: 'psychologue', label: `${target.name}`, result: 'MORT cette nuit — aucune information.' })
      } else {
        indicators[actions.psyTarget].inspectePsy = true
        reports.push({
          type: 'info', role: 'psychologue',
          label: `État de ${target.name}`,
          result: target.etat === 'mutant' ? 'MUTANT' : 'SAIN',
        })
      }
    }
  }

  // ── ÉTAPE 5 : Généticien ────────────────────────────────────────────────────
  if (state.enabledRoles.includes('geneticien') && actions.geneticienTarget) {
    const gen = players.find(p => p.role === 'geneticien')
    if (!gen || !gen.alive) {
      reports.push({ type: 'skip', role: 'geneticien', reason: 'mort' })
    } else if (indicators[gen.id].paralyse) {
      reports.push({ type: 'skip', role: 'geneticien', reason: 'paralysé' })
    } else {
      indicators[gen.id].aOuvertLesYeux = true
      const target = getPlayer(actions.geneticienTarget)
      if (!target.alive) {
        reports.push({ type: 'info', role: 'geneticien', label: `${target.name}`, result: 'MORT cette nuit — aucune information.' })
      } else {
        indicators[actions.geneticienTarget].inspecteGeneticien = true
        reports.push({
          type: 'info', role: 'geneticien',
          label: `Génome de ${target.name}`,
          result: target.genome.toUpperCase(),
        })
      }
    }
  }

  // ── ÉTAPE 6 : Espion ────────────────────────────────────────────────────────
  if (state.enabledRoles.includes('espion') && actions.espionTarget) {
    const esp = players.find(p => p.role === 'espion')
    if (!esp || !esp.alive) {
      reports.push({ type: 'skip', role: 'espion', reason: 'mort' })
    } else if (indicators[esp.id].paralyse) {
      reports.push({ type: 'skip', role: 'espion', reason: 'paralysé' })
    } else {
      indicators[esp.id].aOuvertLesYeux = true
      const target = getPlayer(actions.espionTarget)
      if (!target.alive) {
        reports.push({ type: 'info', role: 'espion', label: `${target.name}`, result: 'MORT cette nuit — aucune information.' })
      } else {
        const ind = indicators[actions.espionTarget]
        const lines = [
          `A ouvert les yeux : ${ind.aOuvertLesYeux ? 'OUI' : 'NON'}`,
          `Muté cette nuit : ${ind.mute ? 'OUI' : 'NON'}`,
          `Paralysé : ${ind.paralyse ? 'OUI' : 'NON'}`,
          `Infecté : ${ind.infecte ? 'OUI' : 'NON'}`,
          `Soigné : ${ind.soigne ? 'OUI' : 'NON'}`,
          `Inspecté par le psy : ${ind.inspectePsy ? 'OUI' : 'NON'}`,
          `Inspecté par le généticien : ${ind.inspecteGeneticien ? 'OUI' : 'NON'}`,
        ]
        reports.push({
          type: 'info', role: 'espion',
          label: `Rapport sur ${target.name}`,
          result: lines.join('\n'),
        })
      }
    }
  }

  // ── ÉTAPE 7 : Hacker ────────────────────────────────────────────────────────
  if (state.enabledRoles.includes('hacker') && actions.hackerRole) {
    const hack = players.find(p => p.role === 'hacker')
    if (!hack || !hack.alive) {
      reports.push({ type: 'skip', role: 'hacker', reason: 'mort' })
    } else if (indicators[hack.id].paralyse) {
      reports.push({ type: 'skip', role: 'hacker', reason: 'paralysé' })
    } else {
      indicators[hack.id].aOuvertLesYeux = true
      const targetRole = actions.hackerRole
      const roleHolder = players.find(p => p.role === targetRole)

      if (!roleHolder || !roleHolder.alive || indicators[roleHolder.id].paralyse) {
        reports.push({ type: 'info', role: 'hacker', label: `Piratage ${targetRole}`, result: 'Aucune information — rôle indisponible.' })
      } else {
        // Reprend le résultat du rôle piraté
        const hackedReport = reports.find(r => r.type === 'info' && r.role === targetRole)
        if (hackedReport && hackedReport.type === 'info') {
          reports.push({
            type: 'info', role: 'hacker',
            label: `Piratage ${targetRole} → ${hackedReport.label}`,
            result: hackedReport.result,
          })
        } else {
          reports.push({ type: 'info', role: 'hacker', label: `Piratage ${targetRole}`, result: 'Aucune information disponible.' })
        }
      }
    }
  }

  // ── Mettre à jour hackerHistory ─────────────────────────────────────────────
  let hackerHistory = [...state.hackerHistory]
  if (actions.hackerRole) {
    const livingInfoRoles = players
      .filter(p => p.alive && ['informaticien', 'psychologue', 'geneticien'].includes(p.role))
      .map(p => p.role as Role)
    const allHacked = livingInfoRoles.every(r => hackerHistory.includes(r))
    if (allHacked) hackerHistory = []  // reset cycle
    hackerHistory.push(actions.hackerRole)
  }

  // ── Journalisation ──────────────────────────────────────────────────────────
  const logEntry = {
    timestamp: Date.now(),
    description: `Nuit ${state.nightNumber} résolue — ${reports.length} événements.`,
  }

  // ── Historique de nuit (diff avant/après) ─────────────────────────────────
  const summaryEvents: NightSummaryEvent[] = []
  for (const after of players) {
    const before = state.players.find(p => p.id === after.id)!
    if (before.alive && !after.alive)
      summaryEvents.push({ icon: '✕', text: `${after.name} est mort·e.`, color: 'text-hud-red' })
    else if (before.etat === 'sain' && after.etat === 'mutant')
      summaryEvents.push({ icon: '⚠', text: `${after.name} a été muté·e.`, color: 'text-hud-amber' })
    else if (before.etat === 'mutant' && after.etat === 'sain')
      summaryEvents.push({ icon: '✓', text: `${after.name} a été soigné·e.`, color: 'text-hud-green' })
  }
  if (summaryEvents.length === 0)
    summaryEvents.push({ icon: '—', text: 'Aucun événement notable.', color: 'text-hud-muted' })

  const nightSummary = { nightNumber: state.nightNumber, events: summaryEvents }

  return {
    state: {
      ...state,
      players,
      nightIndicators: indicators,
      hackerHistory,
      log: [...state.log, logEntry],
      nightHistory: [...state.nightHistory, nightSummary],
      phase: 'day',
    },
    reports,
  }
}
