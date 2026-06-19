# QR Code Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un mode "QR code" dans DistributionScreen permettant à l'OdB d'afficher un QR code par joueur que celui-ci scanne pour voir son rôle sur son propre téléphone.

**Architecture:** Le token system et le routing hash existent déjà (`encodeToken` → `App.tsx` lit `#<token>` → `PlayerCard`). Il suffit d'ajouter un 3e mode `'qr'` dans DistributionScreen qui affiche un `<QRCodeSVG>` encodant l'URL `${origin}/#${token}`. Un écran plein-écran par joueur : l'OdB voit le nom, le joueur scanne, l'OdB appuie sur "Scanné" pour passer au suivant.

**Tech Stack:** `qrcode.react` v4 (React SVG QR codes, zéro dépendance)

---

### Task 1 : Installer qrcode.react

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1 : Installer le package**

```bash
npm install qrcode.react
```

Expected output : `added 1 package` (ou similaire), pas d'erreur.

- [ ] **Step 2 : Vérifier l'import fonctionne**

```bash
node -e "require('./node_modules/qrcode.react/lib/index.js'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 3 : Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add qrcode.react dependency"
```

---

### Task 2 : Ajouter le mode QR dans DistributionScreen

**Files:**
- Modify: `src/ui/cockpit/DistributionScreen.tsx`

**Contexte :** Le composant a déjà un state `passMode` avec `'pass' | 'link'`. On ajoute `'qr'`. En mode `qr`, cliquer sur un joueur affiche un écran plein-écran avec son nom + un QR code + un bouton "Scanné". L'URL encodée dans le QR est `${window.location.origin}/#${token}` — exactement ce que le mode `link` copie déjà.

- [ ] **Step 1 : Modifier DistributionScreen.tsx**

Remplacer le contenu complet du fichier par :

```tsx
import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useGame } from '../../store/gameStore'
import { encodeToken } from '../../engine'
import HudPanel from '../shared/HudPanel'
import PlayerCard from '../player/PlayerCard'
import type { Player } from '../../engine'

function copyToClipboard(text: string, setCopiedId: (id: string | null) => void, playerId: string) {
  navigator.clipboard.writeText(text).then(() => {
    setCopiedId(playerId)
    setTimeout(() => setCopiedId(null), 2000)
  }).catch(() => {
    window.prompt('Copiez ce lien :', text)
  })
}

export default function DistributionScreen() {
  const { state, setState } = useGame()
  const [passMode, setPassMode] = useState<'pass' | 'link' | 'qr'>('pass')
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (!state) return null

  const startNight = () => setState({ ...state, phase: 'night', nightNumber: 1 })

  const revealPlayer = (p: Player) => setRevealedId(p.id)

  const hidePlayer = () => {
    if (revealedId) setDoneIds(prev => new Set([...prev, revealedId]))
    setRevealedId(null)
  }

  const revealed = state.players.find(p => p.id === revealedId)

  // Mode "passe le téléphone" : affiche carte plein écran
  if (revealedId && revealed && passMode === 'pass') {
    const token = {
      n: revealed.name,
      r: revealed.role,
      e: revealed.etat,
      ...(revealed.role === 'mutant_base' ? { h: true as true } : {}),
    }
    return (
      <div>
        <PlayerCard token={token} />
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-hud-bg border-t border-hud-border">
          <button
            onClick={hidePlayer}
            className="w-full py-3 border border-hud-amber text-hud-amber font-bold tracking-widest uppercase hover:bg-hud-amber hover:text-hud-bg transition-colors rounded-sm"
          >
            ✓ Masquer — passer au suivant
          </button>
        </div>
      </div>
    )
  }

  // Mode "QR code" : affiche QR plein écran à scanner
  if (revealedId && revealed && passMode === 'qr') {
    const token = encodeToken({
      n: revealed.name,
      r: revealed.role,
      e: revealed.etat,
      ...(revealed.role === 'mutant_base' ? { h: true } : {}),
    })
    const url = `${window.location.origin}/#${token}`
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-hud-bg gap-8">
        <div className="text-center">
          <div className="text-xs text-hud-muted uppercase tracking-widest mb-1">QR Code pour</div>
          <div className="text-2xl font-bold text-hud-green">{revealed.name}</div>
        </div>
        <div className="p-4 bg-white rounded-sm">
          <QRCodeSVG value={url} size={240} />
        </div>
        <div className="text-xs text-hud-muted text-center max-w-xs">
          Montrez ce QR code au joueur.<br />Il scanне avec son téléphone pour voir son rôle.
        </div>
        <button
          onClick={hidePlayer}
          className="w-full max-w-xs py-3 border border-hud-amber text-hud-amber font-bold tracking-widest uppercase hover:bg-hud-amber hover:text-hud-bg transition-colors rounded-sm"
        >
          ✓ Scanné — joueur suivant
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
        {(['pass', 'qr', 'link'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setPassMode(mode)}
            className={`flex-1 py-2 text-sm border rounded-sm uppercase tracking-wider transition-colors
              ${passMode === mode ? 'border-hud-green bg-hud-green text-hud-bg font-bold' : 'border-hud-border text-hud-muted hover:border-hud-muted'}`}
          >
            {mode === 'pass' ? 'Passe le tel' : mode === 'qr' ? 'QR Code' : 'Liens'}
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
                {passMode === 'link' ? (
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/#${token}`, setCopiedId, p.id)}
                    className={`px-3 py-1 text-xs border transition-colors rounded-sm
                      ${copiedId === p.id ? 'border-hud-green text-hud-green' : 'border-hud-blue text-hud-blue hover:bg-hud-blue hover:text-hud-bg'}`}
                  >
                    {copiedId === p.id ? '✓ Copié' : 'Copier le lien'}
                  </button>
                ) : (
                  <button
                    onClick={() => revealPlayer(p)}
                    disabled={done}
                    className="px-3 py-1 text-xs border border-hud-green text-hud-green hover:bg-hud-green hover:text-hud-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-sm"
                  >
                    {done ? '✓ Lu' : passMode === 'qr' ? 'Afficher QR' : 'Voir son rôle'}
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

- [ ] **Step 2 : Vérifier que le build TypeScript passe**

```bash
npx tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 3 : Vérifier visuellement dans le navigateur**

```bash
npm run dev
```

Aller sur `http://localhost:5173/odb`, créer une partie, aller à l'écran Distribution, cliquer sur "QR Code" dans le toggle, puis "Afficher QR" pour un joueur. Vérifier que le QR s'affiche, le scanner avec un téléphone et vérifier que la PlayerCard s'ouvre.

- [ ] **Step 4 : Commit**

```bash
git add src/ui/cockpit/DistributionScreen.tsx
git commit -m "feat(distribution): ajouter mode QR code pour distribution des rôles"
```

---

### Task 3 : Push et déploiement

- [ ] **Step 1 : Push**

```bash
git push
```

Vercel déploie automatiquement depuis GitHub. Vérifier le déploiement sur le dashboard Vercel.
