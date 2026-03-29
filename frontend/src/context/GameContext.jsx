// src/context/GameContext.jsx
// Provides game state + actions to the entire component tree.
// Keeps useGame logic separate from UI components.

import { createContext, useContext } from 'react'
import { Outlet } from 'react-router-dom'
import { useGame } from '../hooks/useGame'

const GameCtx = createContext(null)

export function GameProvider() {
  const game = useGame()
  return (
    <GameCtx.Provider value={game}>
      <Outlet />
    </GameCtx.Provider>
  )
}

export function useGameContext() {
  const ctx = useContext(GameCtx)
  if (!ctx) throw new Error('useGameContext must be used inside <GameProvider>')
  return ctx
}
