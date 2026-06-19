import { Link } from 'react-router-dom'
import type { PlayerToken } from '../../engine'
import HudPanel from '../shared/HudPanel'

const ROLE_DESCRIPTIONS: Record<string, { label: string; action: string; color: string }> = {
  mutant_base:   { label: 'Mutant de base',  action: 'Chaque nuit : choisissez de muter OU tuer une cible (+ paralyser une cible). Votre but : contaminer tout l\'équipage.', color: 'text-hud-red' },
  medecin:       { label: 'Médecin',          action: 'Chaque nuit : soignez 1 ou 2 joueurs (si vous êtes 2 éveillés) OU tuez 1 joueur. Un mutant soigné redevient sain, sauf s\'il est hôte.', color: 'text-hud-green' },
  informaticien: { label: 'Informaticien',    action: 'Chaque nuit : l\'OdB vous indique le nombre de mutants vivants après résolution.', color: 'text-hud-blue' },
  psychologue:   { label: 'Psychologue',      action: 'Chaque nuit : désignez un joueur — l\'OdB vous dit s\'il est sain ou mutant.', color: 'text-hud-blue' },
  geneticien:    { label: 'Généticien',       action: 'Chaque nuit : désignez un joueur — l\'OdB vous révèle son génome (normal, résistant ou hôte).', color: 'text-hud-blue' },
  espion:        { label: 'Espion',           action: 'Chaque nuit : désignez un joueur — l\'OdB vous liste tout ce qui lui est arrivé cette nuit (muté, soigné, inspecté…).', color: 'text-hud-blue' },
  hacker:        { label: 'Hacker',           action: 'Chaque nuit : piratez un rôle d\'information (informaticien, psy ou généticien) pour obtenir son résultat. Impossible de répéter le même rôle tant que vous n\'avez pas piraté tous les autres rôles vivants.', color: 'text-hud-blue' },
  astronaute:    { label: 'Astronaute',       action: 'Pas d\'action nocturne. Participez aux discussions de jour, votez avec sagesse.', color: 'text-hud-muted' },
}

interface PlayerCardProps {
  token: PlayerToken
}

export default function PlayerCard({ token }: PlayerCardProps) {
  const info = ROLE_DESCRIPTIONS[token.r] ?? ROLE_DESCRIPTIONS['astronaute']
  const isMutant = token.e === 'mutant'

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isMutant ? 'bg-hud-red/5' : 'bg-hud-bg'}`}>
      <div className="w-full max-w-sm space-y-4">
        <div className={`text-center py-4 border-2 rounded-sm ${isMutant ? 'border-hud-red' : 'border-hud-green'}`}>
          <div className="text-xs text-hud-muted uppercase tracking-widest mb-1">Identité de mission</div>
          <div className="text-2xl font-bold text-hud-green">{token.n}</div>
        </div>

        <HudPanel title="Rôle">
          <div className={`text-xl font-bold ${info.color} mb-1`}>{info.label}</div>
          <div className={`text-sm font-bold uppercase tracking-widest ${isMutant ? 'text-hud-red' : 'text-hud-green'}`}>
            {isMutant ? '⚠ MUTANT' : '✓ SAIN'}
          </div>
          {token.h && (
            <div className="text-xs text-hud-amber mt-1">Génome : HÔTE (vous le savez)</div>
          )}
        </HudPanel>

        <HudPanel title="Action nocturne">
          <p className="text-sm text-hud-muted leading-relaxed">{info.action}</p>
        </HudPanel>

        <div className="text-center text-xs text-hud-muted opacity-50">
          Ne partagez pas cet écran.
        </div>

        <div className="text-center">
          <Link to="/?player=1" className="text-xs text-hud-muted hover:text-hud-green transition-colors underline underline-offset-2">
            Récap des règles →
          </Link>
        </div>
      </div>
    </div>
  )
}
