// src/pages/LobbyPage.jsx
// Entry point for authenticated players.
// Allows triggering quick match and shows searching state.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth }        from '../context/AuthContext'
import { useGameContext } from '../context/GameContext'
import { GAME_STATUS }    from '../lib/constants'

export default function LobbyPage() {
  const { account, signOut }                      = useAuth()
  const { gameStatus, error, findMatch, leaveGame } = useGameContext()
  const navigate                                  = useNavigate()

  const displayName = account?.user?.display_name || 'Player'
  const avatarUrl   = account?.user?.avatar_url   || null

  // Navigate to game once a match is found
  useEffect(() => {
    if (
      gameStatus === GAME_STATUS.PLAYING ||
      gameStatus === GAME_STATUS.WAITING
    ) {
      navigate('/game')
    }
  }, [gameStatus, navigate])

  const isSearching = gameStatus === GAME_STATUS.SEARCHING

  return (
    <div className="lobby-root">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="lobby-header">
        <div className="user-chip">
          {avatarUrl && <img src={avatarUrl} alt="" className="user-avatar" />}
          <span className="user-name">{displayName}</span>
        </div>
        <button className="btn-ghost" onClick={signOut}>Sign out</button>
      </header>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="lobby-main">
        {/* Decorative board preview */}
        <div className="preview-board" aria-hidden="true">
          {['X', '', 'O', '', 'X', '', 'O', '', 'X'].map((mark, i) => (
            <div key={i} className={`preview-cell ${mark ? 'has-mark' : ''}`}>
              {mark && <span className={`preview-mark mark-${mark.toLowerCase()}`}>{mark}</span>}
            </div>
          ))}
        </div>

        <h1 className="lobby-title">Find a match</h1>
        <p className="lobby-desc">
          You'll be instantly paired with another online player.
          All moves are validated server-side — no cheating possible.
        </p>

        {error && <p className="error-banner" role="alert">{error}</p>}

        {isSearching ? (
          <div className="searching-block">
            <div className="search-pulse">
              <div className="pulse-ring" />
              <div className="pulse-ring pulse-ring-2" />
              <span className="pulse-icon">⚡</span>
            </div>
            <p className="searching-text">Searching for opponent…</p>
            <button className="btn-ghost" onClick={leaveGame}>Cancel</button>
          </div>
        ) : (
          <button className="btn-primary btn-xl" onClick={findMatch}>
            <span>Quick Match</span>
          </button>
        )}
      </main>
    </div>
  )
}
