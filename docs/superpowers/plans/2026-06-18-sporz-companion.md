# Sporz Companion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire une SPA statique d'assistance pour le jeu Sporz (rôles cachés) permettant à l'Ordinateur de Bord de gérer une partie complète sans erreur de calcul.

**Architecture:** Moteur TypeScript pur (`engine/`) sans dépendance React, testé unitairement avant toute UI. L'UI React consomme le moteur via un store (`gameStore.ts`). Trois surfaces : `/` (référence publique), `/odb` (cockpit OdB), `/#<token>` (carte joueur).

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS 4, Vitest, React Router v6. Thème : cockpit spatial (fond noir, HUD vert/ambre/rouge, monospace).

---

## Arborescence cible

```
sporz/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── engine/
│   │   ├── types.ts           # Genome, Etat, Role, Player, GameState, NightActions, *Report
│   │   ├── setup.ts           # assignRoles(names, enabledRoles) → GameState
│   │   ├── night.ts           # resolveNight(state, actions) → { state, reports }
│   │   ├── day.ts             # resolveExecution(state, targetId) → { state, reports }
│   │   ├── endCondition.ts    # checkEnd(state) → winner | null | 'imminent'
│   │   ├── token.ts           # encodeToken / decodeToken (base64url)
│   │   └── index.ts           # re-exports publics
│   ├── store/
│   │   └── gameStore.ts       # localStorage encapsulé + React context/reducer
│   ├── ui/
│   │   ├── cockpit/
│   │   │   ├── CockpitRouter.tsx    # gère phases setup/distribution/night/day/ended
│   │   │   ├── SetupScreen.tsx      # noms joueurs + rôles optionnels
│   │   │   ├── DistributionScreen.tsx
│   │   │   ├── NightScreen.tsx      # assistant pas-à-pas
│   │   │   ├── DayScreen.tsx        # autopsie + vote + exécution
│   │   │   └── EndScreen.tsx        # victoire + récap log
│   │   ├── player/
│   │   │   └── PlayerCard.tsx       # lit #token, affiche rôle
│   │   ├── reference/
│   │   │   └── ReferencePage.tsx    # règles publiques complètes
│   │   └── shared/
│   │       ├── HudPanel.tsx         # conteneur cockpit avec bordure HUD
│   │       ├── PlayerList.tsx       # tableau de bord OdB (rôle/état/génome)
│   │       └── StatusBadge.tsx      # badge coloré sain/mutant/mort
│   └── theme/
│       └── colors.ts          # constantes couleurs HUD réutilisées
├── src/engine/__tests__/
│   ├── setup.test.ts
│   ├── night.test.ts          # 14 cas d'acceptation PRD §11
│   └── endCondition.test.ts
```

---

## Task 1 : Scaffolding du projet

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`

- [ ] **Step 1 : Initialiser le projet Vite**

```bash
cd /c/Users/malih/Projects/sporz
npm create vite@latest . -- --template react-ts
npm install
```

- [ ] **Step 2 : Installer les dépendances**

```bash
npm install react-router-dom
npm install -D tailwindcss @tailwindcss/vite vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3 : Configurer Vite**

Remplacer `vite.config.ts` :

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
})
```

- [ ] **Step 4 : Créer le fichier setup de tests**

Créer `src/setupTests.ts` :

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5 : Configurer Tailwind avec le thème cockpit spatial**

Remplacer `tailwind.config.ts` :

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        hud: {
          green:  '#00ff9f',
          amber:  '#ffb800',
          red:    '#ff3b3b',
          blue:   '#4fc3f7',
          bg:     '#050a0e',
          panel:  '#0a1628',
          border: '#1a3a5c',
          muted:  '#3a5a7c',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
    },
  },
} satisfies Config
```

- [ ] **Step 6 : Configurer index.html avec la fonte**

Remplacer `index.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sporz Companion</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
  </head>
  <body class="bg-hud-bg font-mono text-hud-green min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7 : Configurer le CSS global**

Remplacer `src/index.css` :

```css
@import "tailwindcss";

* {
  box-sizing: border-box;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

:focus-visible {
  outline: 2px solid #00ff9f;
  outline-offset: 2px;
}
```

- [ ] **Step 8 : Créer src/main.tsx minimal**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 9 : Créer App.tsx minimal (stub)**

```tsx
export default function App() {
  return <div className="p-4">Sporz Companion — en construction</div>
}
```

- [ ] **Step 10 : Vérifier que le dev server démarre**

```bash
npm run dev
```

Expected : serveur sur http://localhost:5173, page blanche sur fond noir avec texte vert.

- [ ] **Step 11 : Commit**

```bash
git init
git add .
git commit -m "chore: scaffolding Vite+React+TS+Tailwind+Vitest, thème cockpit spatial"
```

---

## Task 2 : Types du moteur

**Files:**
- Create: `src/engine/types.ts`

- [ ] **Step 1 : Écrire les types**

Créer `src/engine/types.ts` :

```ts
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
  pendingNight: NightActions
  hackerHistory: Role[]
  log: GameEvent[]
  winner: 'sains' | 'mutants' | null
  nightIndicators: Record<string, NightIndicators>
}
```

- [ ] **Step 2 : Vérifier la compilation**

```bash
npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 3 : Commit**

```bash
git add src/engine/types.ts
git commit -m "feat(engine): définition des types GameState, Player, NightActions, Reports"
```

---

## Task 3 : Moteur — Setup (assignRoles)

**Files:**
- Create: `src/engine/setup.ts`
- Create: `src/engine/__tests__/setup.test.ts`

- [ ] **Step 1 : Écrire les tests**

Créer `src/engine/__tests__/setup.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { assignRoles } from '../setup'

describe('assignRoles', () => {
  it('assigne exactement 1 mutant_base avec etat=mutant et genome=hote', () => {
    const state = assignRoles(['A','B','C','D','E','F','G','H'], ['informaticien'])
    const base = state.players.filter(p => p.role === 'mutant_base')
    expect(base).toHaveLength(1)
    expect(base[0].etat).toBe('mutant')
    expect(base[0].genome).toBe('hote')
  })

  it('assigne exactement 2 médecins avec genome=normal et etat=sain', () => {
    const state = assignRoles(['A','B','C','D','E','F','G','H'], [])
    const medecins = state.players.filter(p => p.role === 'medecin')
    expect(medecins).toHaveLength(2)
    medecins.forEach(m => {
      expect(m.genome).toBe('normal')
      expect(m.etat).toBe('sain')
    })
  })

  it('assigne exactement 1 hote et 1 resistant parmi les non-mutant-non-medecin', () => {
    const state = assignRoles(['A','B','C','D','E','F','G','H'], [])
    const others = state.players.filter(p => p.role !== 'mutant_base' && p.role !== 'medecin')
    const hotes = others.filter(p => p.genome === 'hote')
    const resistants = others.filter(p => p.genome === 'resistant')
    expect(hotes).toHaveLength(1)
    expect(resistants).toHaveLength(1)
  })

  it('tous les joueurs hors mutant_base commencent sain', () => {
    const state = assignRoles(['A','B','C','D','E','F','G','H'], [])
    state.players.filter(p => p.role !== 'mutant_base').forEach(p => {
      expect(p.etat).toBe('sain')
    })
  })

  it('les rôles optionnels activés sont présents', () => {
    const state = assignRoles(
      ['A','B','C','D','E','F','G','H','I'],
      ['informaticien', 'psychologue']
    )
    const roles = state.players.map(p => p.role)
    expect(roles).toContain('informaticien')
    expect(roles).toContain('psychologue')
  })

  it('les joueurs restants sont astronautes', () => {
    const state = assignRoles(['A','B','C','D','E','F','G','H'], ['informaticien'])
    const astros = state.players.filter(p => p.role === 'astronaute')
    expect(astros.length).toBeGreaterThanOrEqual(1)
    expect(state.players).toHaveLength(8)
  })

  it('phase initiale = distribution', () => {
    const state = assignRoles(['A','B','C','D','E','F','G','H'], [])
    expect(state.phase).toBe('distribution')
  })
})
```

- [ ] **Step 2 : Lancer les tests — vérifier FAIL**

```bash
npx vitest run src/engine/__tests__/setup.test.ts
```

Expected : FAIL — "Cannot find module '../setup'"

- [ ] **Step 3 : Implémenter assignRoles**

Créer `src/engine/setup.ts` :

```ts
import type { GameState, Player, Role, Genome, Etat } from './types'

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

  // Attribution génomes aux non-mutant-non-médecin
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

  const emptyNightIndicators: Record<string, import('./types').NightIndicators> = {}
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
```

- [ ] **Step 4 : Lancer les tests — vérifier PASS**

```bash
npx vitest run src/engine/__tests__/setup.test.ts
```

Expected : 7 tests PASS

- [ ] **Step 5 : Commit**

```bash
git add src/engine/setup.ts src/engine/__tests__/setup.test.ts
git commit -m "feat(engine): assignRoles - attribution rôles, génomes, état initial"
```

---

## Task 4 : Moteur — resolveNight (cœur des règles)

**Files:**
- Create: `src/engine/night.ts`
- Create: `src/engine/__tests__/night.test.ts`

- [ ] **Step 1 : Écrire les 14 tests d'acceptation (PRD §11)**

Créer `src/engine/__tests__/night.test.ts` :

```ts
import { describe, it, expect } from 'vitest'
import { resolveNight } from '../night'
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
    pendingNight: emptyActions(),
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
  const { isHackerRoleAllowed } = require('../night')
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
  const { getPublicRole } = require('../night')
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
```

- [ ] **Step 2 : Lancer les tests — vérifier FAIL**

```bash
npx vitest run src/engine/__tests__/night.test.ts
```

Expected : FAIL — "Cannot find module '../night'"

- [ ] **Step 3 : Implémenter resolveNight**

Créer `src/engine/night.ts` :

```ts
import type {
  GameState, NightActions, NightReport, Player, Role, NightIndicators
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
  const eveils = medecins.filter(m => m.alive && m.etat === 'sain' && !indicators[m.id].paralyse)
  const endormis = medecins.filter(m => m.alive && (m.etat === 'mutant' || indicators[m.id].paralyse))

  endormis.forEach(m => {
    const reason = m.etat === 'mutant' ? 'muté' : 'paralysé'
    reports.push({ type: 'skip', role: 'medecin', reason })
    reports.push({ type: 'consigne', text: `Médecin (${m.name}) ${reason} — ne se réveille pas, mimer l'action.` })
  })

  // Soins
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
      indicators[actions.psyTarget].inspectePsy = true
      reports.push({
        type: 'info', role: 'psychologue',
        label: `État de ${target.name}`,
        result: target.etat === 'mutant' ? 'MUTANT' : 'SAIN',
      })
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
      indicators[actions.geneticienTarget].inspecteGeneticien = true
      reports.push({
        type: 'info', role: 'geneticien',
        label: `Génome de ${target.name}`,
        result: target.genome.toUpperCase(),
      })
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
      const ind = indicators[actions.espionTarget]
      const target = getPlayer(actions.espionTarget)
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

  return {
    state: {
      ...state,
      players,
      nightIndicators: indicators,
      hackerHistory,
      log: [...state.log, logEntry],
      phase: 'day',
    },
    reports,
  }
}
```

- [ ] **Step 4 : Lancer les tests — vérifier PASS**

```bash
npx vitest run src/engine/__tests__/night.test.ts
```

Expected : 12/12 tests PASS (CAS 12 et 14 couverts ailleurs)

- [ ] **Step 5 : Commit**

```bash
git add src/engine/night.ts src/engine/__tests__/night.test.ts
git commit -m "feat(engine): resolveNight - 12 cas d'acceptation PRD §11 (mutation, soins, rôles d'info, hacker, espion)"
```

---

## Task 5 : Moteur — endCondition + resolveExecution

**Files:**
- Create: `src/engine/endCondition.ts`
- Create: `src/engine/day.ts`
- Create: `src/engine/__tests__/endCondition.test.ts`

- [ ] **Step 1 : Écrire les tests**

Créer `src/engine/__tests__/endCondition.test.ts` :

```ts
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
  const state = makeState([p('s1','sain'), p('s2','sain'), p('m1','mutant',undefined,false)])
  expect(checkEnd(state)).toBe('sains')
})

// CAS 12b : victoire des mutants
it('CAS 12b : victoire mutants quand tous les vivants sont mutants', () => {
  const state = makeState([p('m1','mutant'), p('m2','mutant'), p('s1','sain',undefined,false)])
  expect(checkEnd(state)).toBe('mutants')
})

// CAS 12c : victoire imminente
it('CAS 12c : imminente si médecins tous morts/mutés ET mutants majoritaires', () => {
  const state = makeState([
    p('m1','mutant'),
    p('m2','mutant'),
    p('s1','sain'),
    { ...p('med1','mutant','medecin'), role: 'medecin' },
    { ...p('med2','sain','medecin'), alive: false, role: 'medecin' },
  ])
  expect(checkEnd(state)).toBe('imminent')
})

// CAS 10 via resolveExecution : mutant_base autopsiée → publicRole = astronaute
it('CAS 10 : autopsie mutant_base → rôle public astronaute', () => {
  const base = p('m1','mutant','mutant_base')
  base.genome = 'hote' as any
  const state = makeState([base, p('s1','sain')])
  const { reports } = resolveExecution(state, 'm1')
  const autopsie = reports.find(r => r.type === 'autopsie')!
  expect(autopsie.publicRole).toBe('astronaute')
})
```

- [ ] **Step 2 : Lancer les tests — vérifier FAIL**

```bash
npx vitest run src/engine/__tests__/endCondition.test.ts
```

Expected : FAIL

- [ ] **Step 3 : Implémenter checkEnd**

Créer `src/engine/endCondition.ts` :

```ts
import type { GameState, EndResult } from './types'

export function checkEnd(state: GameState): EndResult {
  const alive = state.players.filter(p => p.alive)
  if (alive.length === 0) return 'sains'

  const mutants = alive.filter(p => p.etat === 'mutant')
  const sains   = alive.filter(p => p.etat === 'sain')

  if (mutants.length === 0) return 'sains'
  if (sains.length === 0)   return 'mutants'

  // Victoire imminente : médecins vivants tous mutés ET mutants majoritaires
  const medecinVivants = alive.filter(p => p.role === 'medecin')
  const medecinsSains  = medecinVivants.filter(p => p.etat === 'sain')
  if (medecinsSains.length === 0 && mutants.length > sains.length) {
    return 'imminent'
  }

  return null
}
```

- [ ] **Step 4 : Implémenter resolveExecution**

Créer `src/engine/day.ts` :

```ts
import type { GameState, DayReport } from './types'
import { getPublicRole } from './night'

export function resolveExecution(
  state: GameState,
  targetId: string | null
): { state: GameState; reports: DayReport[] } {
  const reports: DayReport[] = []
  if (!targetId) return { state, reports }

  const players = state.players.map(p => ({ ...p }))
  const target = players.find(p => p.id === targetId)
  if (!target) return { state, reports }

  target.alive = false

  reports.push({
    type: 'autopsie',
    playerId: target.id,
    playerName: target.name,
    role: target.role,
    etat: target.etat,
    genome: target.genome,
    publicRole: getPublicRole(target),
  })

  const logEntry = { timestamp: Date.now(), description: `Exécution de ${target.name} (${getPublicRole(target)}).` }

  return {
    state: { ...state, players, log: [...state.log, logEntry] },
    reports,
  }
}
```

- [ ] **Step 5 : Lancer les tests — vérifier PASS**

```bash
npx vitest run src/engine/__tests__/endCondition.test.ts
```

Expected : 4 tests PASS

- [ ] **Step 6 : Commit**

```bash
git add src/engine/endCondition.ts src/engine/day.ts src/engine/__tests__/endCondition.test.ts
git commit -m "feat(engine): checkEnd (victoire sains/mutants/imminent) + resolveExecution avec autopsie"
```

---

## Task 6 : Moteur — token + index

**Files:**
- Create: `src/engine/token.ts`
- Create: `src/engine/index.ts`

- [ ] **Step 1 : Implémenter token.ts**

```ts
// src/engine/token.ts
export interface PlayerToken {
  n: string   // nom
  r: string   // role
  e: string   // etat
  h?: true    // hote (mutant_base seulement)
}

export function encodeToken(token: PlayerToken): string {
  return btoa(JSON.stringify(token))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function decodeToken(raw: string): PlayerToken | null {
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - raw.length % 4) % 4)
    return JSON.parse(atob(padded)) as PlayerToken
  } catch {
    return null
  }
}
```

- [ ] **Step 2 : Créer index.ts**

```ts
// src/engine/index.ts
export * from './types'
export * from './setup'
export * from './night'
export * from './day'
export * from './endCondition'
export * from './token'
```

- [ ] **Step 3 : Vérifier compilation**

```bash
npx tsc --noEmit
```

Expected : aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add src/engine/token.ts src/engine/index.ts
git commit -m "feat(engine): token base64url encode/decode + barrel export"
```

---

## Task 7 : Store — gameStore (localStorage)

**Files:**
- Create: `src/store/gameStore.tsx`

- [ ] **Step 1 : Implémenter le store**

Créer `src/store/gameStore.tsx` :

```tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react'
import type { GameState, NightActions } from '../engine'

const STORAGE_KEY = 'sporz_game_v1'

function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as GameState) : null
  } catch {
    return null
  }
}

function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // repli silencieux
  }
}

type Action =
  | { type: 'SET_STATE'; state: GameState }
  | { type: 'RESET' }

function reducer(state: GameState | null, action: Action): GameState | null {
  if (action.type === 'RESET') return null
  if (action.type === 'SET_STATE') return action.state
  return state
}

interface GameContextValue {
  state: GameState | null
  setState: (s: GameState) => void
  reset: () => void
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, null, () => loadState())

  useEffect(() => {
    if (state) saveState(state)
    else {
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignored */ }
    }
  }, [state])

  const setState = (s: GameState) => dispatch({ type: 'SET_STATE', state: s })
  const reset = () => dispatch({ type: 'RESET' })

  return (
    <GameContext.Provider value={{ state, setState, reset }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/store/gameStore.tsx
git commit -m "feat(store): localStorage wrapper avec GameProvider/useGame"
```

---

## Task 8 : Routing principal (App.tsx)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1 : Mettre à jour main.tsx**

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { GameProvider } from './store/gameStore'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <GameProvider>
        <App />
      </GameProvider>
    </BrowserRouter>
  </React.StrictMode>
)
```

- [ ] **Step 2 : Mettre à jour App.tsx avec la logique de routage**

```tsx
// src/App.tsx
import { useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { decodeToken } from './engine'
import PlayerCard from './ui/player/PlayerCard'
import CockpitRouter from './ui/cockpit/CockpitRouter'
import ReferencePage from './ui/reference/ReferencePage'

export default function App() {
  const location = useLocation()
  const [tokenData, setTokenData] = useState<ReturnType<typeof decodeToken>>(null)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) setTokenData(decodeToken(hash))
    else setTokenData(null)
  }, [location.hash])

  // Priorité 1 : hash présent → carte joueur
  if (tokenData) return <PlayerCard token={tokenData} />

  return (
    <Routes>
      <Route path="/odb" element={<CockpitRouter />} />
      <Route path="/*" element={<ReferencePage />} />
    </Routes>
  )
}
```

- [ ] **Step 3 : Créer les stubs des composants manquants pour que la compilation passe**

Créer `src/ui/player/PlayerCard.tsx` (stub) :
```tsx
import type { PlayerToken } from '../../engine'
export default function PlayerCard({ token }: { token: PlayerToken }) {
  return <div className="p-4">Carte joueur — {token.n}</div>
}
```

Créer `src/ui/cockpit/CockpitRouter.tsx` (stub) :
```tsx
export default function CockpitRouter() {
  return <div className="p-4">Cockpit OdB</div>
}
```

Créer `src/ui/reference/ReferencePage.tsx` (stub) :
```tsx
export default function ReferencePage() {
  return <div className="p-4">Référence publique</div>
}
```

- [ ] **Step 4 : Vérifier compilation + dev server**

```bash
npx tsc --noEmit && npm run dev
```

Expected : aucune erreur TS, server démarre.

- [ ] **Step 5 : Commit**

```bash
git add src/App.tsx src/main.tsx src/ui/
git commit -m "feat: routing principal (hash→PlayerCard, /odb→Cockpit, /→Référence)"
```

---

## Task 9 : Composants partagés HUD

**Files:**
- Create: `src/ui/shared/HudPanel.tsx`
- Create: `src/ui/shared/StatusBadge.tsx`
- Create: `src/ui/shared/PlayerList.tsx`
- Create: `src/theme/colors.ts`

- [ ] **Step 1 : Créer colors.ts**

```ts
// src/theme/colors.ts
export const hud = {
  green:  'text-hud-green',
  amber:  'text-hud-amber',
  red:    'text-hud-red',
  blue:   'text-hud-blue',
  border: 'border-hud-border',
  panel:  'bg-hud-panel',
  muted:  'text-hud-muted',
} as const
```

- [ ] **Step 2 : Créer HudPanel.tsx**

```tsx
// src/ui/shared/HudPanel.tsx
interface HudPanelProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export default function HudPanel({ title, children, className = '' }: HudPanelProps) {
  return (
    <div className={`border border-hud-border bg-hud-panel rounded-sm p-4 ${className}`}>
      {title && (
        <div className="text-xs text-hud-muted uppercase tracking-widest mb-3 pb-2 border-b border-hud-border">
          ⬡ {title}
        </div>
      )}
      {children}
    </div>
  )
}
```

- [ ] **Step 3 : Créer StatusBadge.tsx**

```tsx
// src/ui/shared/StatusBadge.tsx
import type { Etat, Genome } from '../../engine'

interface StatusBadgeProps {
  etat?: Etat
  genome?: Genome
  alive?: boolean
}

export default function StatusBadge({ etat, genome, alive = true }: StatusBadgeProps) {
  if (!alive) return <span className="text-xs text-hud-muted px-2 py-0.5 border border-hud-muted rounded-sm">MORT</span>
  if (etat === 'mutant') return <span className="text-xs text-hud-red px-2 py-0.5 border border-hud-red rounded-sm">MUTANT</span>
  if (genome === 'resistant') return <span className="text-xs text-hud-blue px-2 py-0.5 border border-hud-blue rounded-sm">RÉSISTANT</span>
  if (genome === 'hote') return <span className="text-xs text-hud-amber px-2 py-0.5 border border-hud-amber rounded-sm">HÔTE</span>
  return <span className="text-xs text-hud-green px-2 py-0.5 border border-hud-green rounded-sm">SAIN</span>
}
```

- [ ] **Step 4 : Créer PlayerList.tsx (tableau de bord OdB)**

```tsx
// src/ui/shared/PlayerList.tsx
import type { Player } from '../../engine'
import StatusBadge from './StatusBadge'

interface PlayerListProps {
  players: Player[]
  showSecrets?: boolean  // true = mode OdB (rôle/état/génome réels)
  onSelect?: (id: string) => void
  selectedIds?: string[]
}

export default function PlayerList({ players, showSecrets = false, onSelect, selectedIds = [] }: PlayerListProps) {
  return (
    <ul className="space-y-1">
      {players.map(p => (
        <li
          key={p.id}
          onClick={() => onSelect?.(p.id)}
          className={`flex items-center justify-between p-2 rounded-sm border text-sm cursor-pointer transition-colors
            ${!p.alive ? 'opacity-40 border-hud-muted' : selectedIds.includes(p.id) ? 'border-hud-green bg-hud-green/10' : 'border-hud-border hover:border-hud-muted'}`}
        >
          <span className={p.isChef ? 'text-hud-amber' : ''}>
            {p.isChef ? '★ ' : ''}{p.name}
          </span>
          <div className="flex gap-2 items-center">
            {showSecrets && (
              <span className="text-hud-muted text-xs">{p.role}</span>
            )}
            <StatusBadge etat={p.etat} genome={showSecrets ? p.genome : undefined} alive={p.alive} />
          </div>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 5 : Commit**

```bash
git add src/ui/shared/ src/theme/
git commit -m "feat(ui): composants HUD partagés (HudPanel, StatusBadge, PlayerList)"
```

---

## Task 10 : Cockpit — SetupScreen

**Files:**
- Modify: `src/ui/cockpit/CockpitRouter.tsx`
- Create: `src/ui/cockpit/SetupScreen.tsx`

- [ ] **Step 1 : Implémenter SetupScreen.tsx**

```tsx
// src/ui/cockpit/SetupScreen.tsx
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
```

- [ ] **Step 2 : Mettre à jour CockpitRouter.tsx**

```tsx
// src/ui/cockpit/CockpitRouter.tsx
import { useGame } from '../../store/gameStore'
import SetupScreen from './SetupScreen'
import DistributionScreen from './DistributionScreen'
import NightScreen from './NightScreen'
import DayScreen from './DayScreen'
import EndScreen from './EndScreen'

export default function CockpitRouter() {
  const { state, reset } = useGame()

  if (!state || state.phase === 'setup') return <SetupScreen />
  if (state.phase === 'distribution')   return <DistributionScreen />
  if (state.phase === 'night')          return <NightScreen />
  if (state.phase === 'day')            return <DayScreen />
  if (state.phase === 'ended')          return <EndScreen />
  return <SetupScreen />
}
```

Créer les stubs des écrans manquants :

```tsx
// src/ui/cockpit/DistributionScreen.tsx
export default function DistributionScreen() { return <div className="p-4 text-hud-green">Distribution — en construction</div> }

// src/ui/cockpit/NightScreen.tsx
export default function NightScreen() { return <div className="p-4 text-hud-green">Nuit — en construction</div> }

// src/ui/cockpit/DayScreen.tsx
export default function DayScreen() { return <div className="p-4 text-hud-green">Jour — en construction</div> }

// src/ui/cockpit/EndScreen.tsx
export default function EndScreen() { return <div className="p-4 text-hud-green">Fin — en construction</div> }
```

- [ ] **Step 3 : Vérifier compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 4 : Commit**

```bash
git add src/ui/cockpit/
git commit -m "feat(ui/cockpit): SetupScreen avec ajout joueurs, rôles optionnels, validation"
```

---

## Task 11 : Cockpit — DistributionScreen

**Files:**
- Modify: `src/ui/cockpit/DistributionScreen.tsx`

- [ ] **Step 1 : Implémenter DistributionScreen.tsx**

```tsx
// src/ui/cockpit/DistributionScreen.tsx
import { useState } from 'react'
import { useGame } from '../../store/gameStore'
import { encodeToken } from '../../engine'
import HudPanel from '../shared/HudPanel'
import PlayerCard from '../player/PlayerCard'
import type { Player } from '../../engine'

export default function DistributionScreen() {
  const { state, setState } = useGame()
  const [passMode, setPassMode] = useState<'pass' | 'link'>('pass')
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())

  if (!state) return null

  const startNight = () => setState({ ...state, phase: 'night', nightNumber: 1 })

  const revealPlayer = (p: Player) => setRevealedId(p.id)

  const hidePlayer = () => {
    if (revealedId) setDoneIds(prev => new Set([...prev, revealedId]))
    setRevealedId(null)
  }

  const revealed = state.players.find(p => p.id === revealedId)

  // Mode "passe le téléphone" : affiche carte plein écran
  if (revealedId && revealed) {
    const token = {
      n: revealed.name,
      r: revealed.role,
      e: revealed.etat,
      ...(revealed.role === 'mutant_base' ? { h: true as true } : {}),
    }
    return (
      <div className="min-h-screen flex flex-col">
        <PlayerCard token={token} />
        <button
          onClick={hidePlayer}
          className="m-4 py-3 border border-hud-amber text-hud-amber font-bold tracking-widest uppercase hover:bg-hud-amber hover:text-hud-bg transition-colors rounded-sm"
        >
          ✓ Masquer — passer au suivant
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 p-4">
      <h1 className="text-hud-green text-xl font-bold tracking-widest uppercase">
        ⬡ Distribution des rôles
      </h1>

      <div className="flex gap-2">
        {(['pass', 'link'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setPassMode(mode)}
            className={`flex-1 py-2 text-sm border rounded-sm uppercase tracking-wider transition-colors
              ${passMode === mode ? 'border-hud-green bg-hud-green text-hud-bg font-bold' : 'border-hud-border text-hud-muted hover:border-hud-muted'}`}
          >
            {mode === 'pass' ? 'Passe le téléphone' : 'Liens secrets'}
          </button>
        ))}
      </div>

      <HudPanel title="Équipage">
        <ul className="space-y-2">
          {state.players.map(p => {
            const done = doneIds.has(p.id)
            const token = encodeToken({ n: p.name, r: p.role, e: p.etat, ...(p.role === 'mutant_base' ? { h: true } : {}) })
            return (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className={done ? 'text-hud-muted line-through' : 'text-hud-green'}>
                  {p.name}
                </span>
                {passMode === 'pass' ? (
                  <button
                    onClick={() => revealPlayer(p)}
                    disabled={done}
                    className="px-3 py-1 text-xs border border-hud-green text-hud-green hover:bg-hud-green hover:text-hud-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-sm"
                  >
                    {done ? '✓ Lu' : 'Voir son rôle'}
                  </button>
                ) : (
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/#${token}`)}
                    className="px-3 py-1 text-xs border border-hud-blue text-hud-blue hover:bg-hud-blue hover:text-hud-bg transition-colors rounded-sm"
                  >
                    Copier le lien
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </HudPanel>

      <button
        onClick={startNight}
        className="w-full py-3 border border-hud-green text-hud-green font-bold tracking-widest uppercase hover:bg-hud-green hover:text-hud-bg transition-colors rounded-sm"
      >
        ▶ Commencer la nuit 1
      </button>
    </div>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/ui/cockpit/DistributionScreen.tsx
git commit -m "feat(ui/cockpit): DistributionScreen - passe le téléphone + liens secrets"
```

---

## Task 12 : Cockpit — NightScreen (assistant pas-à-pas)

**Files:**
- Modify: `src/ui/cockpit/NightScreen.tsx`

- [ ] **Step 1 : Implémenter NightScreen.tsx**

```tsx
// src/ui/cockpit/NightScreen.tsx
import { useState } from 'react'
import { useGame } from '../../store/gameStore'
import { resolveNight, checkEnd } from '../../engine'
import type { NightActions, Role, NightReport } from '../../engine'
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
  const [results, setResults] = useState<NightReport[]>([])
  const [finalReports, setFinalReports] = useState<NightReport[] | null>(null)

  if (!state) return null

  const livingPlayers = state.players.filter(p => p.alive)
  const currentStep = STEP_ORDER[stepIdx]

  // Sauter automatiquement les rôles non activés ou sans joueur vivant
  const shouldSkipStep = (step: Step): boolean => {
    if (step === 'mutants' || step === 'medecins' || step === 'done') return false
    return !state.enabledRoles.includes(step as Role) ||
      !state.players.some(p => p.role === step && p.alive)
  }

  const nextStep = () => {
    let next = stepIdx + 1
    while (next < STEP_ORDER.length - 1 && shouldSkipStep(STEP_ORDER[next])) next++
    if (STEP_ORDER[next] === 'done') {
      // Résoudre la nuit
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

  const selectTarget = (field: keyof NightActions, value: string) =>
    setActions(prev => ({ ...prev, [field]: value }))

  if (finalReports) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <h2 className="text-hud-green text-lg font-bold tracking-widest uppercase">Nuit {state.nightNumber} — Résultats</h2>
        {finalReports.map((r, i) => <ReportCard key={i} report={r} />)}
      </div>
    )
  }

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

      {/* Tableau de bord OdB permanent */}
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
  players: ReturnType<typeof state.players.filter>
  state: import('../../engine').GameState
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
              onSelect={id => set('mutantsTarget', id)}
              selectedIds={actions.mutantsTarget ? [actions.mutantsTarget] : []} />
          </div>
        )}
        <div>
          <p className="text-xs text-hud-muted mb-1">Paralyser (optionnel) :</p>
          <PlayerList players={players}
            onSelect={id => set('paralyzeTarget', actions.paralyzeTarget === id ? null : id)}
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
              onSelect={id => setActions(prev => {
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
              onSelect={id => set('medecinKill', id)}
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
          onSelect={id => set('psyTarget', id)}
          selectedIds={actions.psyTarget ? [actions.psyTarget] : []} />
      </div>
    )
  }

  if (step === 'geneticien') {
    return (
      <div>
        <p className="text-xs text-hud-muted mb-2">Cible :</p>
        <PlayerList players={players}
          onSelect={id => set('geneticienTarget', id)}
          selectedIds={actions.geneticienTarget ? [actions.geneticienTarget] : []} />
      </div>
    )
  }

  if (step === 'espion') {
    return (
      <div>
        <p className="text-xs text-hud-muted mb-2">Cible :</p>
        <PlayerList players={players}
          onSelect={id => set('espionTarget', id)}
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
```

- [ ] **Step 2 : Vérifier compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 3 : Commit**

```bash
git add src/ui/cockpit/NightScreen.tsx
git commit -m "feat(ui/cockpit): NightScreen - assistant pas-à-pas avec navigation avant/arrière"
```

---

## Task 13 : Cockpit — DayScreen + EndScreen

**Files:**
- Modify: `src/ui/cockpit/DayScreen.tsx`
- Modify: `src/ui/cockpit/EndScreen.tsx`

- [ ] **Step 1 : Implémenter DayScreen.tsx**

```tsx
// src/ui/cockpit/DayScreen.tsx
import { useState } from 'react'
import { useGame } from '../../store/gameStore'
import { resolveExecution, checkEnd } from '../../engine'
import HudPanel from '../shared/HudPanel'
import PlayerList from '../shared/PlayerList'

export default function DayScreen() {
  const { state, setState } = useGame()
  const [selectedVote, setSelectedVote] = useState<string | 'blanc' | null>(null)
  const [autopsyDone, setAutopsyDone] = useState(false)

  if (!state) return null

  const nightDeaths = state.log
    .slice(-20)
    .filter(e => e.description.includes('Exécution') || e.description.includes('tué'))

  const execute = () => {
    if (!selectedVote) return
    const targetId = selectedVote === 'blanc' ? null : selectedVote
    const { state: nextState, reports } = resolveExecution(state, targetId)
    const endResult = checkEnd(nextState)
    const finalState = endResult === 'sains' || endResult === 'mutants'
      ? { ...nextState, phase: 'ended' as const, winner: endResult }
      : nextState
    setState(finalState)
  }

  const nextNight = () => {
    setState({ ...state, phase: 'night', nightNumber: state.nightNumber + 1,
      pendingNight: { mutantsMode:null,mutantsTarget:null,paralyzeTarget:null,medecinHeals:[],medecinKill:null,psyTarget:null,geneticienTarget:null,espionTarget:null,hackerRole:null } })
  }

  const livePlayers = state.players.filter(p => p.alive)

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <h1 className="text-hud-amber text-xl font-bold tracking-widest uppercase">
        ☀ Jour {state.nightNumber}
      </h1>

      <HudPanel title="Tableau de bord OdB">
        <PlayerList players={state.players} showSecrets />
      </HudPanel>

      <HudPanel title="Vote — Qui exécuter ?">
        <PlayerList
          players={livePlayers}
          onSelect={id => setSelectedVote(id)}
          selectedIds={selectedVote && selectedVote !== 'blanc' ? [selectedVote] : []}
        />
        <button
          onClick={() => setSelectedVote('blanc')}
          className={`mt-3 w-full py-2 text-sm border rounded-sm transition-colors
            ${selectedVote === 'blanc' ? 'border-hud-blue bg-hud-blue/10 text-hud-blue' : 'border-hud-border text-hud-muted hover:border-hud-muted'}`}
        >
          ○ Vote blanc (personne n'est exécuté)
        </button>
      </HudPanel>

      <button
        onClick={execute}
        disabled={!selectedVote}
        className="w-full py-3 border border-hud-red text-hud-red font-bold tracking-widest uppercase hover:bg-hud-red hover:text-hud-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-sm"
      >
        ▶ Exécuter
      </button>

      <button
        onClick={nextNight}
        className="w-full py-3 border border-hud-green text-hud-green font-bold tracking-widest uppercase hover:bg-hud-green hover:text-hud-bg transition-colors rounded-sm"
      >
        ▶ Nuit suivante
      </button>
    </div>
  )
}
```

- [ ] **Step 2 : Implémenter EndScreen.tsx**

```tsx
// src/ui/cockpit/EndScreen.tsx
import { useGame } from '../../store/gameStore'
import HudPanel from '../shared/HudPanel'

export default function EndScreen() {
  const { state, reset } = useGame()
  if (!state) return null

  const isVictorySains = state.winner === 'sains'

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6 text-center">
      <div className={`text-4xl font-bold tracking-widest uppercase py-6 border rounded-sm ${isVictorySains ? 'border-hud-green text-hud-green' : 'border-hud-red text-hud-red'}`}>
        {isVictorySains ? '✓ VICTOIRE DES SAINS' : '✕ VICTOIRE DES MUTANTS'}
      </div>

      <HudPanel title={`Journal — ${state.nightNumber} nuit(s)`}>
        <ul className="text-left space-y-1 text-xs text-hud-muted max-h-48 overflow-y-auto">
          {state.log.map((entry, i) => (
            <li key={i} className="border-b border-hud-border pb-1">
              {new Date(entry.timestamp).toLocaleTimeString('fr-FR')} — {entry.description}
            </li>
          ))}
        </ul>
      </HudPanel>

      <HudPanel title="Révélation finale">
        <ul className="text-left space-y-1 text-sm">
          {state.players.map(p => (
            <li key={p.id} className="flex justify-between text-hud-muted">
              <span>{p.name}</span>
              <span>{p.role === 'mutant_base' ? 'astronaute*' : p.role} — {p.etat} — {p.genome}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-hud-muted mt-2">* mutant de base annoncé comme astronaute en jeu</p>
      </HudPanel>

      <button
        onClick={reset}
        className="w-full py-3 border border-hud-green text-hud-green font-bold tracking-widest uppercase hover:bg-hud-green hover:text-hud-bg transition-colors rounded-sm"
      >
        ▶ Nouvelle mission
      </button>
    </div>
  )
}
```

- [ ] **Step 3 : Commit**

```bash
git add src/ui/cockpit/DayScreen.tsx src/ui/cockpit/EndScreen.tsx
git commit -m "feat(ui/cockpit): DayScreen (vote/exécution) + EndScreen (victoire + journal)"
```

---

## Task 14 : PlayerCard (carte joueur)

**Files:**
- Modify: `src/ui/player/PlayerCard.tsx`

- [ ] **Step 1 : Implémenter PlayerCard.tsx**

```tsx
// src/ui/player/PlayerCard.tsx
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
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Commit**

```bash
git add src/ui/player/PlayerCard.tsx
git commit -m "feat(ui/player): PlayerCard - carte rôle avec rappel action nocturne, thème cockpit spatial"
```

---

## Task 15 : ReferencePage (référence publique)

**Files:**
- Modify: `src/ui/reference/ReferencePage.tsx`

- [ ] **Step 1 : Implémenter ReferencePage.tsx**

```tsx
// src/ui/reference/ReferencePage.tsx
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
```

- [ ] **Step 2 : Commit**

```bash
git add src/ui/reference/ReferencePage.tsx
git commit -m "feat(ui/reference): ReferencePage - règles publiques complètes (rôles, génomes, déroulé, victoire)"
```

---

## Task 16 : Tests finaux + vérification

- [ ] **Step 1 : Lancer tous les tests**

```bash
npx vitest run
```

Expected : tous les tests PASS (setup, night, endCondition)

- [ ] **Step 2 : Vérifier la compilation complète**

```bash
npx tsc --noEmit
```

Expected : 0 erreurs.

- [ ] **Step 3 : Build de production**

```bash
npm run build
```

Expected : build réussi dans `dist/`.

- [ ] **Step 4 : Vérifier le build**

```bash
npm run preview
```

Vérifier manuellement :
- `/` → ReferencePage en fond noir, texte vert
- `/odb` → SetupScreen
- Créer une partie, tester l'assistant de nuit
- `/#<token_valide>` → PlayerCard

- [ ] **Step 5 : Créer vercel.json pour le routing SPA**

```json
{
  "rewrites": [{ "source": "/((?!_next/).*)", "destination": "/index.html" }]
}
```

- [ ] **Step 6 : Commit final**

```bash
git add vercel.json
git commit -m "chore: vercel.json SPA rewrite pour déploiement statique"
```

---

## Self-Review — couverture spec

| Exigence PRD | Tâche | Statut |
|---|---|---|
| Types complets §5 | Task 2 | ✓ |
| assignRoles §6 | Task 3 | ✓ |
| resolveNight + 14 cas §7/§11 | Task 4 | ✓ (12 cas night, 2 end/day) |
| checkEnd §9 | Task 5 | ✓ |
| resolveExecution + autopsie §8 | Task 5 | ✓ |
| token base64url §4 | Task 6 | ✓ |
| localStorage encapsulé §4 | Task 7 | ✓ |
| Routing hash/odb/référence §4 | Task 8 | ✓ |
| SetupScreen §10-A | Task 10 | ✓ |
| DistributionScreen §10-B | Task 11 | ✓ |
| NightScreen pas-à-pas §10-C | Task 12 | ✓ |
| Bouton retour nuit §10-C | Task 12 | ✓ |
| DayScreen §10-D | Task 13 | ✓ |
| EndScreen §10-E | Task 13 | ✓ |
| Tableau OdB permanent §10 | Task 9, 12, 13 | ✓ |
| PlayerCard §10 | Task 14 | ✓ |
| ReferencePage §10 | Task 15 | ✓ |
| Mobile-first, focus clavier, prefers-reduced-motion §11 | Task 1 (CSS), tous | ✓ |
| Thème cockpit spatial | Task 1, 9 | ✓ |
| Zéro backend §3 | Architecture | ✓ |
| Vercel statique §4 | Task 16 | ✓ |
