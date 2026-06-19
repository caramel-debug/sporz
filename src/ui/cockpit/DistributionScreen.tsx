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
      g: state.gid,
      t: Date.now(),
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
      g: state.gid,
      t: Date.now(),
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
          Montrez ce QR code au joueur.<br />Il scanne avec son téléphone pour voir son rôle.
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
      <div className="flex items-center justify-between">
        <h1 className="text-hud-green text-xl font-bold tracking-widest uppercase">
          ⬡ Distribution des rôles
        </h1>
        <span className="text-xs text-hud-muted border border-hud-border px-2 py-1 rounded-sm font-mono">
          #{state.gid}
        </span>
      </div>

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
            const token = encodeToken({ n: p.name, r: p.role, e: p.etat, g: state.gid, t: Date.now(), ...(p.role === 'mutant_base' ? { h: true } : {}) })
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
