import { useState } from 'react'
import { useGame } from '../../store/gameStore'
import { resolveNight, checkEnd } from '../../engine'
import type { NightActions, Role, NightReport, GameState } from '../../engine'
import type { Player } from '../../engine'
import HudPanel from '../shared/HudPanel'
import PlayerList from '../shared/PlayerList'

type Step = 'mutants' | 'medecins' | 'informaticien' | 'psychologue' | 'geneticien' | 'espion' | 'hacker' | 'done'

const STEP_ORDER: Step[] = ['mutants', 'medecins', 'informaticien', 'psychologue', 'geneticien', 'espion', 'hacker', 'done']

const STEP_LABELS: Record<Step, string> = {
  mutants:      'Mutants',
  medecins:     'Médecins',
  informaticien:'Informaticien',
  psychologue:  'Psychologue',
  geneticien:   'Généticien',
  espion:       'Espion',
  hacker:       'Hacker',
  done:         'Fin de nuit',
}

const NARRATION: Record<Step, string> = {
  mutants:      '« Équipage, fermez les yeux. Les mutants ouvrent les yeux et se concertent. »',
  medecins:     '« Médecins, ouvrez les yeux. »',
  informaticien:'« Informaticien, ouvrez les yeux. »',
  psychologue:  '« Psychologue, ouvrez les yeux. Désignez votre cible. »',
  geneticien:   '« Généticien, ouvrez les yeux. Désignez votre cible. »',
  espion:       '« Espion, ouvrez les yeux. Désignez votre cible. »',
  hacker:       '« Hacker, ouvrez les yeux. Choisissez le rôle à pirater. »',
  done:         '',
}

export default function NightScreen() {
  const { state, setState } = useGame()
  const [actions, setActions] = useState<NightActions>({
    mutantsMode: null, mutantsTarget: null, paralyzeTarget: null,
    medecinHeals: [], medecinKill: null,
    psyTarget: null, geneticienTarget: null, espionTarget: null, hackerRole: null,
  })
  const [stepIdx, setStepIdx] = useState(0)
  const [finalReports, setFinalReports] = useState<NightReport[] | null>(null)
  const [pendingState, setPendingState] = useState<GameState | null>(null)

  if (!state) return null

  // Aperçu temps réel : applique toutes les actions saisies dans l'ordre de résolution
  const previewPlayers = (() => {
    // Étape 1 : Mutants (mutation / kill / paralysie)
    let players = state.players.map(p => {
      const clone = { ...p }
      if (actions.mutantsMode === 'kill' && actions.mutantsTarget === clone.id)
        clone.alive = false
      if (actions.mutantsMode === 'mutate' && actions.mutantsTarget === clone.id && clone.genome !== 'resistant')
        clone.etat = 'mutant'
      return clone
    })

    // Étape 2 : Médecins (soins / kill) — seulement si au moins un médecin éveillé
    const hasAwakeMedecin = players.some(p =>
      p.role === 'medecin' && p.alive && p.etat === 'sain' && actions.paralyzeTarget !== p.id
    )
    if (hasAwakeMedecin) {
      if (actions.medecinKill) {
        players = players.map(p =>
          p.id === actions.medecinKill && p.alive ? { ...p, alive: false } : p
        )
      } else {
        players = players.map(p => {
          if (actions.medecinHeals.includes(p.id) && p.alive && p.etat === 'mutant' && p.genome !== 'hote')
            return { ...p, etat: 'sain' as const }
          return p
        })
      }
    }

    return players
  })()

  const livingPlayers = previewPlayers.filter(p => p.alive)

  const shouldSkipStep = (step: Step): boolean => {
    if (step === 'mutants' || step === 'medecins' || step === 'done') return false
    return !state.enabledRoles.includes(step as Role) ||
      !state.players.some(p => p.role === step && p.alive)
  }

  const nextStep = () => {
    let next = stepIdx + 1
    while (next < STEP_ORDER.length - 1 && shouldSkipStep(STEP_ORDER[next])) next++
    if (STEP_ORDER[next] === 'done') {
      const { state: nextState, reports } = resolveNight(state, actions)
      const endResult = checkEnd(nextState)
      const finalState = endResult === 'sains' || endResult === 'mutants'
        ? { ...nextState, phase: 'ended' as const, winner: endResult }
        : { ...nextState, phase: 'day' as const }
      setFinalReports(reports)
      setPendingState(finalState)
    } else {
      setStepIdx(next)
    }
  }

  const prevStep = () => {
    let prev = stepIdx - 1
    while (prev > 0 && shouldSkipStep(STEP_ORDER[prev])) prev--
    setStepIdx(Math.max(0, prev))
  }

  if (finalReports && pendingState) {
    const isEnd = pendingState.phase === 'ended'

    // Résumé basé sur le diff d'état (avant → après)
    const summary: { icon: string; text: string; color: string }[] = []
    for (const after of pendingState.players) {
      const before = state.players.find(p => p.id === after.id)!
      if (before.alive && !after.alive)
        summary.push({ icon: '✕', text: `${after.name} est mort·e cette nuit.`, color: 'text-hud-red border-hud-red' })
      else if (before.etat === 'sain' && after.etat === 'mutant')
        summary.push({ icon: '⚠', text: `${after.name} a été muté·e.`, color: 'text-hud-amber border-hud-amber' })
      else if (before.etat === 'mutant' && after.etat === 'sain')
        summary.push({ icon: '✓', text: `${after.name} a été soigné·e.`, color: 'text-hud-green border-hud-green' })
    }

    // Garder uniquement les rapports spéciaux (pas les skip/consigne/info opérationnels)
    const specialReports = finalReports.filter(r =>
      r.type === 'mutation_echec' || r.type === 'soin_echec_hote_mute'
    )

    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <h2 className="text-hud-green text-lg font-bold tracking-widest uppercase">Nuit {state.nightNumber} — Résultats</h2>
        {summary.length === 0 && specialReports.length === 0 && (
          <p className="text-hud-muted text-sm">Aucun événement notable cette nuit.</p>
        )}
        {summary.map((s, i) => (
          <div key={i} className={`border bg-hud-panel p-3 rounded-sm text-sm ${s.color}`}>
            {s.icon} {s.text}
          </div>
        ))}
        {specialReports.map((r, i) => <ReportCard key={`r${i}`} report={r} />)}
        <button
          onClick={() => setState(pendingState)}
          className={`w-full py-3 border font-bold tracking-widest uppercase transition-colors rounded-sm
            ${isEnd ? 'border-hud-amber text-hud-amber hover:bg-hud-amber hover:text-hud-bg' : 'border-hud-green text-hud-green hover:bg-hud-green hover:text-hud-bg'}`}
        >
          {isEnd ? '▶ Voir le résultat final' : '☀ Passer au jour →'}
        </button>
      </div>
    )
  }

  const currentStep = STEP_ORDER[stepIdx]

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-hud-green text-lg font-bold tracking-widest uppercase">
          ⬡ Nuit {state.nightNumber}
        </h1>
        <span className="text-hud-muted text-xs">{stepIdx + 1} / {STEP_ORDER.length - 1}</span>
      </div>

      <HudPanel title={STEP_LABELS[currentStep]}>
        <p className="text-hud-amber text-sm italic mb-4">{NARRATION[currentStep]}</p>
        <StepContent step={currentStep} actions={actions} setActions={setActions} players={livingPlayers} state={state} />
      </HudPanel>

      <HudPanel title="Tableau de bord OdB">
        <PlayerList players={previewPlayers} showSecrets paralyzedIds={actions.paralyzeTarget ? [actions.paralyzeTarget] : []} />
      </HudPanel>

      <div className="flex gap-2">
        {stepIdx > 0 && (
          <button onClick={prevStep} className="flex-1 py-2 border border-hud-muted text-hud-muted hover:border-hud-green hover:text-hud-green transition-colors rounded-sm text-sm">
            ← Retour
          </button>
        )}
        <button
          onClick={nextStep}
          className="flex-1 py-2 border border-hud-green text-hud-green font-bold hover:bg-hud-green hover:text-hud-bg transition-colors rounded-sm text-sm"
        >
          {stepIdx === STEP_ORDER.length - 2 ? 'Terminer la nuit →' : 'Suivant →'}
        </button>
      </div>
    </div>
  )
}

function StepContent({ step, actions, setActions, players, state }: {
  step: Step
  actions: NightActions
  setActions: React.Dispatch<React.SetStateAction<NightActions>>
  players: Player[]
  state: GameState
}) {
  const set = (field: keyof NightActions, value: unknown) =>
    setActions(prev => ({ ...prev, [field]: value }))

  if (step === 'informaticien') {
    const info = players.find(p => p.role === 'informaticien')
    const isParalyzed = info && actions.paralyzeTarget === info.id
    const mutantCount = players.filter(p => p.etat === 'mutant').length

    if (!info) return (
      <p className="text-hud-muted text-sm">Informaticien mort — passer.</p>
    )
    if (isParalyzed) return (
      <p className="text-hud-amber text-sm">⚠ {info.name} est paralysé·e — faites semblant qu'il/elle agit, sans donner d'information.</p>
    )
    return (
      <div className="space-y-3">
        <p className="text-xs text-hud-muted">Montrez secrètement à <span className="text-hud-green font-bold">{info.name}</span> :</p>
        <div className="border border-hud-green bg-hud-green/5 rounded-sm p-4 text-center">
          <div className="text-hud-muted text-xs mb-1">Mutants vivants</div>
          <div className="text-hud-green text-4xl font-bold">{mutantCount}</div>
        </div>
      </div>
    )
  }

  if (step === 'mutants') {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          {(['mutate', 'kill'] as const).map(mode => (
            <button key={mode} onClick={() => set('mutantsMode', mode)}
              className={`flex-1 py-2 text-sm border rounded-sm transition-colors ${actions.mutantsMode === mode ? 'border-hud-red bg-hud-red/10 text-hud-red' : 'border-hud-border text-hud-muted'}`}>
              {mode === 'mutate' ? 'Muter' : 'Tuer'}
            </button>
          ))}
        </div>
        {actions.mutantsMode && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-hud-muted">Cible :</p>
              {actions.mutantsTarget && (
                <button onClick={() => set('mutantsTarget', null)} className="text-xs text-hud-muted hover:text-hud-red">× Effacer</button>
              )}
            </div>
            <PlayerList players={players.filter(p => p.etat === 'sain')}
              onSelect={(id: string) => set('mutantsTarget', actions.mutantsTarget === id ? null : id)}
              selectedIds={actions.mutantsTarget ? [actions.mutantsTarget] : []} />
          </div>
        )}
        <div>
          <p className="text-xs text-hud-muted mb-1">Paralyser (optionnel) :</p>
          <PlayerList players={players}
            onSelect={(id: string) => set('paralyzeTarget', actions.paralyzeTarget === id ? null : id)}
            selectedIds={actions.paralyzeTarget ? [actions.paralyzeTarget] : []} />
        </div>
      </div>
    )
  }

  if (step === 'medecins') {
    const allLivingMedecins = players.filter(p => p.role === 'medecin')
    const sleepingMedecins = allLivingMedecins.filter(m =>
      m.etat === 'mutant' || actions.paralyzeTarget === m.id
    )
    const wakeMedecins = allLivingMedecins.filter(m =>
      m.etat === 'sain' && actions.paralyzeTarget !== m.id
    )

    return (
      <div className="space-y-3">
        {sleepingMedecins.map(m => {
          const reason = m.etat === 'mutant' ? 'muté·e' : 'paralysé·e'
          return (
            <div key={m.id} className="border border-hud-amber bg-hud-amber/5 p-2 rounded-sm text-sm text-hud-amber">
              ⚠ {m.name} est {reason} — ne se réveille pas. Faites semblant qu'il/elle agit pour ne rien révéler aux autres joueurs.
            </div>
          )
        })}
        {wakeMedecins.length === 0 ? (
          <p className="text-hud-muted text-sm">Aucun médecin éveillé cette nuit — passer.</p>
        ) : (
          <>
            <div className="flex gap-2">
              <button onClick={() => setActions(prev => ({ ...prev, medecinKill: null }))}
                className={`flex-1 py-2 text-sm border rounded-sm transition-colors ${!actions.medecinKill ? 'border-hud-green bg-hud-green/10 text-hud-green' : 'border-hud-border text-hud-muted'}`}>
                Soigner
              </button>
              <button onClick={() => setActions(prev => ({ ...prev, medecinHeals: [] }))}
                className={`flex-1 py-2 text-sm border rounded-sm transition-colors ${actions.medecinKill ? 'border-hud-red bg-hud-red/10 text-hud-red' : 'border-hud-border text-hud-muted'}`}>
                Tuer (ensemble)
              </button>
            </div>
            {!actions.medecinKill ? (
              <div>
                <p className="text-xs text-hud-muted mb-1">Cibles à soigner (max {wakeMedecins.length}) :</p>
                <PlayerList players={players.filter(p => !wakeMedecins.some(m => m.id === p.id))}
                  onSelect={(id: string) => setActions(prev => {
                    const already = prev.medecinHeals.includes(id)
                    if (already) return { ...prev, medecinHeals: prev.medecinHeals.filter(h => h !== id) }
                    if (prev.medecinHeals.length < wakeMedecins.length) return { ...prev, medecinHeals: [...prev.medecinHeals, id] }
                    return prev
                  })}
                  selectedIds={actions.medecinHeals} />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-hud-muted">Cible à tuer :</p>
                  {actions.medecinKill && (
                    <button onClick={() => set('medecinKill', null)} className="text-xs text-hud-muted hover:text-hud-red">× Effacer</button>
                  )}
                </div>
                <PlayerList players={players}
                  onSelect={(id: string) => set('medecinKill', actions.medecinKill === id ? null : id)}
                  selectedIds={actions.medecinKill ? [actions.medecinKill] : []} />
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  if (step === 'psychologue') {
    const psy = players.find(p => p.role === 'psychologue')
    const isParalyzed = psy && actions.paralyzeTarget === psy.id
    if (!psy) return <p className="text-hud-muted text-sm">Psychologue mort — passer.</p>
    if (isParalyzed) return <p className="text-hud-amber text-sm">⚠ {psy.name} est paralysé·e — faites semblant qu'il/elle agit pour ne rien révéler.</p>

    const target = actions.psyTarget ? players.find(p => p.id === actions.psyTarget) : null
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-hud-muted">Cible :</p>
          {actions.psyTarget && (
            <button onClick={() => set('psyTarget', null)} className="text-xs text-hud-muted hover:text-hud-red">× Effacer</button>
          )}
        </div>
        <PlayerList players={players}
          onSelect={(id: string) => set('psyTarget', actions.psyTarget === id ? null : id)}
          selectedIds={actions.psyTarget ? [actions.psyTarget] : []} />
        {target && (
          <div>
            <p className="text-xs text-hud-muted mb-1">Montrez secrètement à <span className="text-hud-green font-bold">{psy.name}</span> :</p>
            <div className={`border rounded-sm p-4 text-center ${target.etat === 'mutant' ? 'border-hud-red bg-hud-red/5' : 'border-hud-green bg-hud-green/5'}`}>
              <div className="text-hud-muted text-xs mb-1">État de {target.name}</div>
              <div className={`text-2xl font-bold ${target.etat === 'mutant' ? 'text-hud-red' : 'text-hud-green'}`}>
                {target.etat === 'mutant' ? 'MUTANT' : 'SAIN'}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (step === 'geneticien') {
    const gen = players.find(p => p.role === 'geneticien')
    const isParalyzed = gen && actions.paralyzeTarget === gen.id
    if (!gen) return <p className="text-hud-muted text-sm">Généticien mort — passer.</p>
    if (isParalyzed) return <p className="text-hud-amber text-sm">⚠ {gen.name} est paralysé·e — faites semblant qu'il/elle agit pour ne rien révéler.</p>

    const target = actions.geneticienTarget ? players.find(p => p.id === actions.geneticienTarget) : null
    const genomeColor: Record<string, string> = { normal: 'text-hud-green', resistant: 'text-hud-blue', hote: 'text-hud-amber' }
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-hud-muted">Cible :</p>
          {actions.geneticienTarget && (
            <button onClick={() => set('geneticienTarget', null)} className="text-xs text-hud-muted hover:text-hud-red">× Effacer</button>
          )}
        </div>
        <PlayerList players={players}
          onSelect={(id: string) => set('geneticienTarget', actions.geneticienTarget === id ? null : id)}
          selectedIds={actions.geneticienTarget ? [actions.geneticienTarget] : []} />
        {target && (
          <div>
            <p className="text-xs text-hud-muted mb-1">Montrez secrètement à <span className="text-hud-green font-bold">{gen.name}</span> :</p>
            <div className="border border-hud-blue bg-hud-blue/5 rounded-sm p-4 text-center">
              <div className="text-hud-muted text-xs mb-1">Génome de {target.name}</div>
              <div className={`text-2xl font-bold ${genomeColor[target.genome] ?? 'text-hud-green'}`}>
                {target.genome.toUpperCase()}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (step === 'espion') {
    const esp = players.find(p => p.role === 'espion')
    const isParalyzed = esp && actions.paralyzeTarget === esp.id
    if (!esp) return <p className="text-hud-muted text-sm">Espion mort — passer.</p>
    if (isParalyzed) return <p className="text-hud-amber text-sm">⚠ {esp.name} est paralysé·e — faites semblant qu'il/elle agit pour ne rien révéler.</p>

    const target = actions.espionTarget ? players.find(p => p.id === actions.espionTarget) : null
    const original = actions.espionTarget ? state.players.find(p => p.id === actions.espionTarget) : null

    const computeReport = () => {
      if (!original || !actions.espionTarget) return []
      const tid = actions.espionTarget
      const wasMutated = actions.mutantsMode === 'mutate' && actions.mutantsTarget === tid && original.genome !== 'resistant'
      const wasParalyzed = actions.paralyzeTarget === tid
      const hasAwakeMedecin = state.players.some(p => {
        if (p.role !== 'medecin' || !p.alive) return false
        const isMutatedThisNight = actions.mutantsMode === 'mutate' && actions.mutantsTarget === p.id && p.genome !== 'resistant'
        return p.etat === 'sain' && !isMutatedThisNight && actions.paralyzeTarget !== p.id
      })
      const wasHealed = hasAwakeMedecin && actions.medecinHeals.includes(tid)
      const wakeRoles: Role[] = ['informaticien', 'psychologue', 'geneticien', 'espion', 'hacker']
      const aOuvertLesYeux = original.alive && !wasParalyzed && (
        original.role === 'mutant_base' ||
        original.etat === 'mutant' ||
        (original.role === 'medecin' && original.etat === 'sain') ||
        (wakeRoles.includes(original.role) && state.enabledRoles.includes(original.role))
      )
      return [
        { label: 'A ouvert les yeux', value: aOuvertLesYeux },
        { label: 'Muté cette nuit', value: wasMutated },
        { label: 'Paralysé', value: wasParalyzed },
        { label: 'Infecté', value: wasMutated },
        { label: 'Soigné', value: wasHealed },
        { label: 'Inspecté par le psy', value: actions.psyTarget === tid },
        { label: 'Inspecté par le généticien', value: actions.geneticienTarget === tid },
      ]
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-hud-muted">Cible :</p>
          {actions.espionTarget && (
            <button onClick={() => set('espionTarget', null)} className="text-xs text-hud-muted hover:text-hud-red">× Effacer</button>
          )}
        </div>
        <PlayerList players={players}
          onSelect={(id: string) => set('espionTarget', actions.espionTarget === id ? null : id)}
          selectedIds={actions.espionTarget ? [actions.espionTarget] : []} />
        {target && (
          <div>
            <p className="text-xs text-hud-muted mb-1">Montrez secrètement à <span className="text-hud-green font-bold">{esp.name}</span> :</p>
            <div className="border border-hud-green bg-hud-green/5 rounded-sm p-3 text-sm space-y-1">
              <div className="text-hud-muted text-xs mb-2">Rapport sur {target.name}</div>
              {computeReport().map((line, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-hud-muted">{line.label}</span>
                  <span className={line.value ? 'text-hud-amber font-bold' : 'text-hud-muted'}>
                    {line.value ? 'OUI' : 'NON'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (step === 'hacker') {
    const infoRoles: Role[] = ['informaticien', 'psychologue', 'geneticien']
    const available = infoRoles.filter(r => state.players.some(p => p.role === r && p.alive))
    return (
      <div className="space-y-2">
        {available.map(role => (
          <button key={role} onClick={() => set('hackerRole', role)}
            className={`w-full py-2 text-sm border rounded-sm transition-colors
              ${actions.hackerRole === role ? 'border-hud-green bg-hud-green/10 text-hud-green' : 'border-hud-border text-hud-muted hover:border-hud-muted'}`}>
            {role}
          </button>
        ))}
      </div>
    )
  }

  return null
}

function ReportCard({ report }: { report: NightReport }) {
  if (report.type === 'skip') return (
    <div className="border border-hud-muted bg-hud-panel p-3 rounded-sm text-sm text-hud-muted">
      ⊘ {report.role} — {report.reason}
    </div>
  )
  if (report.type === 'consigne') return (
    <div className="border border-hud-amber bg-hud-amber/5 p-3 rounded-sm text-sm text-hud-amber">
      ⚠ {report.text}
    </div>
  )
  if (report.type === 'mutation_echec') return (
    <div className="border border-hud-blue bg-hud-blue/5 p-3 rounded-sm text-sm text-hud-blue">
      ✕ Mutation échouée sur {report.targetName} — résistant ! Faire le toucher répété.
    </div>
  )
  if (report.type === 'soin_echec_hote_mute') return (
    <div className="border border-hud-amber bg-hud-amber/5 p-3 rounded-sm text-sm text-hud-amber">
      ⚠ Soin impossible sur {report.targetName} — mutant hôte. Faire le toucher répété.
    </div>
  )
  if (report.type === 'info') return (
    <div className="border border-hud-green bg-hud-green/5 p-3 rounded-sm text-sm">
      <div className="text-hud-muted text-xs mb-1">{report.role}</div>
      <div className="text-hud-muted">{report.label}</div>
      <div className="text-hud-green font-bold mt-1 whitespace-pre">{report.result}</div>
    </div>
  )
  return null
}
