// src/pages/GamePage.jsx
// Active game screen: wires Board, PlayerBar, StatusBanner,
// and ResultOverlay together around the game context.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameContext } from '../context/GameContext'
import { GAME_STATUS }   from '../lib/constants'
import Board             from '../components/Board'
import PlayerBar         from '../components/PlayerBar'
import StatusBanner      from '../components/StatusBanner'
import ResultOverlay     from '../components/ResultOverlay'

export default function GamePage() {
  const navigate = useNavigate()
  const {
    gameStatus,
    gameState,
    myMark,
    isMyTurn,
    error,
    result,
    sendMove,
    leaveGame,
  } = useGameContext()

  // Redirect to lobby if there's no active game
  useEffect(() => {
    if (gameStatus === GAME_STATUS.IDLE) {
      navigate('/lobby', { replace: true })
    }
  }, [gameStatus, navigate])

  const isFinished = (
    gameStatus === GAME_STATUS.FINISHED ||
    gameStatus === GAME_STATUS.DISCONNECTED
  )
  const isWaiting = gameStatus === GAME_STATUS.WAITING

  function handleLeave() {
    leaveGame()
    navigate('/lobby')
  }

  return (
    <div className="game-root">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="game-header">
        <button className="btn-ghost btn-sm" onClick={handleLeave}>
          ← Leave
        </button>
        <div className="live-badge">
          <span className="live-dot" />
          Live
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────── */}
      <main className="game-main">
        <PlayerBar
          players  ={gameState.players}
          marks    ={gameState.marks}
          turn     ={gameState.turn}
          myMark   ={myMark}
          isWaiting={isWaiting}
        />

        <StatusBanner
          gameStatus={gameStatus}
          isMyTurn  ={isMyTurn}
          myMark    ={myMark}
          error     ={error}
        />

        <Board
          board       ={gameState.board}
          winningLine ={gameState.winning_line}
          onCellClick ={sendMove}
          isMyTurn    ={isMyTurn}
          disabled    ={isFinished || isWaiting}
        />
      </main>

      {/* ── Result overlay (rendered after game over) ────────── */}
      {isFinished && result && (
        <ResultOverlay
          result   ={result}
          onLobby  ={handleLeave}
        />
      )}
    </div>
  )
}
