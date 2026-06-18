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

  if (!state) return null

  const livingPlayers = state.players.filter(p => p.alive)

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
      setState(finalState)
    } else {
      setStepIdx(next)
    }
  }

  const prevStep = () => {
    let prev = stepIdx - 1
    while (prev > 0 && shouldSkipStep(STEP_ORDER[prev])) prev--
    setStepIdx(Math.max(0, prev))
  }

  if (finalReports) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <h2 className="text-hud-green text-lg font-bold tracking-widest uppercase">Nuit {state.nightNumber} — Résultats</h2>
        {finalReports.map((r, i) => <ReportCard key={i} report={r} />)}
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
        <PlayerList players={state.players} showSecrets />
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
            <p className="text-xs text-hud-muted mb-1">Cible :</p>
            <PlayerList players={players.filter(p => p.etat === 'sain')}
              onSelect={(id: string) => set('mutantsTarget', id)}
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
    const wakeMedecins = state.players.filter(p => p.role === 'medecin' && p.alive && p.etat === 'sain')
    return (
      <div className="space-y-3">
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
            <PlayerList players={players}
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
            <p className="text-xs text-hud-muted mb-1">Cible à tuer :</p>
            <PlayerList players={players}
              onSelect={(id: string) => set('medecinKill', id)}
              selectedIds={actions.medecinKill ? [actions.medecinKill] : []} />
          </div>
        )}
      </div>
    )
  }

  if (step === 'psychologue') {
    return (
      <div>
        <p className="text-xs text-hud-muted mb-2">Cible :</p>
        <PlayerList players={players}
          onSelect={(id: string) => set('psyTarget', id)}
          selectedIds={actions.psyTarget ? [actions.psyTarget] : []} />
      </div>
    )
  }

  if (step === 'geneticien') {
    return (
      <div>
        <p className="text-xs text-hud-muted mb-2">Cible :</p>
        <PlayerList players={players}
          onSelect={(id: string) => set('geneticienTarget', id)}
          selectedIds={actions.geneticienTarget ? [actions.geneticienTarget] : []} />
      </div>
    )
  }

  if (step === 'espion') {
    return (
      <div>
        <p className="text-xs text-hud-muted mb-2">Cible :</p>
        <PlayerList players={players}
          onSelect={(id: string) => set('espionTarget', id)}
          selectedIds={actions.espionTarget ? [actions.espionTarget] : []} />
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
