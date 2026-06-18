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
