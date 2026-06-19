import React, { createContext, useContext, useReducer, useEffect } from 'react'
import type { GameState } from '../engine/types'

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
  const [state, dispatch] = useReducer(reducer, null, () => {
    const initial = loadState()
    // Initialise l'entrée courante de l'historique avec l'état chargé
    window.history.replaceState({ gameState: initial }, '')
    return initial
  })

  useEffect(() => {
    if (state) saveState(state)
    else {
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignored */ }
    }
  }, [state])

  // Bouton retour du navigateur → restaure l'état précédent
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const prev: GameState | null = e.state?.gameState ?? null
      if (prev) dispatch({ type: 'SET_STATE', state: prev })
      else dispatch({ type: 'RESET' })
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const setState = (s: GameState) => {
    window.history.pushState({ gameState: s }, '')
    dispatch({ type: 'SET_STATE', state: s })
  }

  const reset = () => {
    window.history.pushState({ gameState: null }, '')
    dispatch({ type: 'RESET' })
  }

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
