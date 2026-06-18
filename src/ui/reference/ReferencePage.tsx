import { Link } from 'react-router-dom'
import HudPanel from '../shared/HudPanel'

const ROLES = [
  { label: 'Mutant de base', color: 'text-hud-red', desc: 'Chaque nuit : muter OU tuer (+ paralyser optionnel). But : contaminer tout l\'équipage.' },
  { label: 'Médecins (×2)', color: 'text-hud-green', desc: 'Chaque nuit : soigner 1 ou 2 joueurs OU tuer 1 joueur. Guérissent les mutants normaux.' },
  { label: 'Informaticien', color: 'text-hud-blue', desc: 'Reçoit le nombre de mutants vivants chaque nuit (après résolution).' },
  { label: 'Psychologue', color: 'text-hud-blue', desc: 'Chaque nuit : apprend l\'état (sain/mutant) d\'un joueur.' },
  { label: 'Généticien', color: 'text-hud-blue', desc: 'Chaque nuit : apprend le génome (normal/résistant/hôte) d\'un joueur.' },
  { label: 'Espion', color: 'text-hud-blue', desc: 'Chaque nuit : reçoit la liste des événements nocturnes d\'un joueur.' },
  { label: 'Hacker', color: 'text-hud-blue', desc: 'Chaque nuit : pirate un rôle d\'info (psy, géné ou info) pour obtenir son résultat.' },
  { label: 'Astronaute', color: 'text-hud-muted', desc: 'Aucune action nocturne. Discute et vote le jour.' },
]

const GENOMES = [
  { label: 'Normal', color: 'text-hud-green', desc: 'Peut être muté normalement. Peut être soigné après mutation.' },
  { label: 'Résistant', color: 'text-hud-blue', desc: 'Immune à la mutation. Si une mutation est tentée, le résistant apprend son génome (toucher répété).' },
  { label: 'Hôte', color: 'text-hud-amber', desc: 'Peut être muté. Une fois muté, insoignable (le mutant hôte apprend son génome). Il y a 2 hôtes : le mutant de base et un joueur tiré au sort.' },
]

export default function ReferencePage() {
  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-hud-green text-xl font-bold tracking-widest uppercase">⬡ Sporz — Référence</h1>
        <Link to="/odb" className="text-xs text-hud-muted hover:text-hud-green transition-colors border border-hud-border px-2 py-1 rounded-sm">
          Mode OdB →
        </Link>
      </div>

      <HudPanel title="Déroulé d'une partie">
        <ol className="text-sm text-hud-muted space-y-1 list-decimal list-inside">
          <li>Mise en place : attribution secrète des rôles et génomes.</li>
          <li>Distribution : chaque joueur prend connaissance de son rôle.</li>
          <li className="text-hud-green">Nuit : l'OdB appelle les rôles un à un (yeux fermés). Les mutants agissent en premier.</li>
          <li className="text-hud-amber">Jour : autopsie des morts, discussion, vote, exécution.</li>
          <li>Répéter nuit/jour jusqu'à la victoire d'un camp.</li>
        </ol>
      </HudPanel>

      <HudPanel title="Conditions de victoire">
        <div className="space-y-2 text-sm">
          <div className="text-hud-green">✓ Sains : plus aucun mutant vivant.</div>
          <div className="text-hud-red">✕ Mutants : tous les vivants sont mutants.</div>
          <div className="text-hud-muted">⚠ Victoire imminente : tous les médecins sains sont morts/mutés ET les mutants sont majoritaires.</div>
        </div>
      </HudPanel>

      <HudPanel title="Rôles">
        <ul className="space-y-3">
          {ROLES.map(r => (
            <li key={r.label}>
              <span className={`font-bold ${r.color}`}>{r.label}</span>
              <p className="text-xs text-hud-muted mt-0.5">{r.desc}</p>
            </li>
          ))}
        </ul>
      </HudPanel>

      <HudPanel title="Génomes">
        <ul className="space-y-3">
          {GENOMES.map(g => (
            <li key={g.label}>
              <span className={`font-bold ${g.color}`}>{g.label}</span>
              <p className="text-xs text-hud-muted mt-0.5">{g.desc}</p>
            </li>
          ))}
        </ul>
      </HudPanel>

      <HudPanel title="Ordre de la nuit">
        <ol className="text-sm text-hud-muted space-y-1 list-decimal list-inside">
          <li><span className="text-hud-red">Mutants</span> — mutation OU meurtre + paralysie</li>
          <li><span className="text-hud-green">Médecins</span> — soins ou meurtre</li>
          <li>Informaticien — nombre de mutants</li>
          <li>Psychologue — état d'un joueur</li>
          <li>Généticien — génome d'un joueur</li>
          <li>Espion — événements nocturnes d'un joueur</li>
          <li>Hacker — pirate un rôle d'information</li>
        </ol>
        <p className="text-xs text-hud-muted mt-2">Les rôles morts, absents ou paralysés sont sautés (l'OdB mime l'action pour les paralysés).</p>
      </HudPanel>

      <HudPanel title="Le vote du jour">
        <ul className="text-sm text-hud-muted space-y-1 list-disc list-inside">
          <li>Chaque vivant peut voter pour un joueur, blanc (personne), ou s'abstenir.</li>
          <li>Majorité relative — le blanc compte comme une voix.</li>
          <li>Égalité : le chef tranche.</li>
          <li>Le joueur exécuté est autopsié (rôle, état, génome révélés).</li>
        </ul>
      </HudPanel>

      <p className="text-center text-xs text-hud-muted opacity-50 pb-4">
        Sporz Companion — assistant de partie non officiel
      </p>
    </div>
  )
}
