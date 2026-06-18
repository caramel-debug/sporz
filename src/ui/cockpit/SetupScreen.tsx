import { useState } from 'react'
import type { Role } from '../../engine'
import { assignRoles } from '../../engine'
import { useGame } from '../../store/gameStore'
import HudPanel from '../shared/HudPanel'

const OPTIONAL_ROLES: { role: Role; label: string }[] = [
  { role: 'informaticien', label: 'Informaticien' },
  { role: 'psychologue',   label: 'Psychologue' },
  { role: 'geneticien',    label: 'Généticien' },
  { role: 'espion',        label: 'Espion' },
  { role: 'hacker',        label: 'Hacker' },
]

export default function SetupScreen() {
  const { setState } = useGame()
  const [names, setNames] = useState<string[]>(['', '', '', '', '', '', '', ''])
  const [enabledRoles, setEnabledRoles] = useState<Role[]>([])
  const [newName, setNewName] = useState('')

  const validNames = names.filter(n => n.trim())
  const minPlayers = 3 + enabledRoles.length  // 1 mutant + 2 medecins + optionnels + 1 astro min
  const isValid = validNames.length >= minPlayers

  const addName = () => {
    if (newName.trim()) {
      setNames(prev => [...prev, newName.trim()])
      setNewName('')
    }
  }

  const removeName = (i: number) => setNames(prev => prev.filter((_, idx) => idx !== i))

  const toggleRole = (role: Role) =>
    setEnabledRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )

  const start = () => {
    if (!isValid) return
    const state = assignRoles(validNames, enabledRoles)
    setState(state)
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 p-4">
      <h1 className="text-hud-green text-xl font-bold tracking-widest uppercase">
        ⬡ Configuration de mission
      </h1>

      <HudPanel title="Équipage">
        <ul className="space-y-1 mb-3">
          {names.map((name, i) => (
            <li key={i} className="flex gap-2">
              <input
                value={name}
                onChange={e => setNames(prev => prev.map((n, idx) => idx === i ? e.target.value : n))}
                className="flex-1 bg-transparent border border-hud-border px-2 py-1 text-sm text-hud-green focus:border-hud-green outline-none rounded-sm"
                placeholder={`Joueur ${i + 1}`}
              />
              <button
                onClick={() => removeName(i)}
                className="text-hud-muted hover:text-hud-red px-2"
                aria-label="Supprimer"
              >×</button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addName()}
            className="flex-1 bg-transparent border border-hud-border px-2 py-1 text-sm text-hud-green focus:border-hud-green outline-none rounded-sm"
            placeholder="Ajouter un joueur…"
          />
          <button
            onClick={addName}
            className="px-3 py-1 border border-hud-green text-hud-green text-sm hover:bg-hud-green hover:text-hud-bg transition-colors rounded-sm"
          >+ Ajouter</button>
        </div>
        <div className="text-xs text-hud-muted mt-2">{validNames.length} joueurs</div>
      </HudPanel>

      <HudPanel title="Rôles spéciaux">
        <div className="text-xs text-hud-muted mb-2">Mutant de base + 2 Médecins : toujours actifs</div>
        <div className="space-y-1">
          {OPTIONAL_ROLES.map(({ role, label }) => (
            <label key={role} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={enabledRoles.includes(role)}
                onChange={() => toggleRole(role)}
                className="accent-hud-green"
              />
              <span className={enabledRoles.includes(role) ? 'text-hud-green' : 'text-hud-muted'}>
                {label}
              </span>
            </label>
          ))}
        </div>
        <div className="text-xs text-hud-muted mt-3">
          {3 + enabledRoles.length} rôles + {Math.max(0, validNames.length - 3 - enabledRoles.length)} astronaute(s)
        </div>
      </HudPanel>

      {!isValid && (
        <div className="text-hud-red text-xs">
          Minimum {minPlayers} joueurs requis pour cette configuration.
        </div>
      )}

      <button
        onClick={start}
        disabled={!isValid}
        className="w-full py-3 border border-hud-green text-hud-green font-bold tracking-widest uppercase hover:bg-hud-green hover:text-hud-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-sm"
      >
        ▶ Démarrer la mission
      </button>
    </div>
  )
}
