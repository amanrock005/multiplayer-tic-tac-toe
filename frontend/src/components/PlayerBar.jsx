// src/components/PlayerBar.jsx
// Displays both player names, their marks, and highlights
// whose turn it is. Shows a waiting spinner if opponent
// hasn't connected yet.

import { useAuth } from '../context/AuthContext'

export default function PlayerBar({ players, marks, turn, myMark, isWaiting }) {
  const { session } = useAuth()

  // Build sorted player list (X always on left)
  const playerList = Object.values(players || {})
    .sort((a, b) => a.mark.localeCompare(b.mark))

  if (isWaiting || playerList.length < 2) {
    return (
      <div className="player-bar player-bar--waiting">
        <div className="player-slot player-slot--ghost">
          <div className="spinner spinner-sm" />
          <span className="waiting-text">Waiting for opponent…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="player-bar">
      {playerList.map((player) => {
        const isActive = player.mark === turn
        const isMe     = player.user_id === session?.user_id

        return (
          <div
            key={player.user_id}
            className={[
              'player-slot',
              isActive ? 'player-slot--active' : 'player-slot--idle',
            ].join(' ')}
          >
            {/* Mark badge */}
            <div className={`mark-badge mark-badge--${player.mark.toLowerCase()}`}>
              {player.mark}
            </div>

            {/* Name + you label */}
            <div className="player-info">
              <span className="player-name">
                {player.name}
                {isMe && <span className="you-badge">you</span>}
              </span>
              {isActive && (
                <span className="turn-label">
                  {isMe ? 'Your turn' : 'Thinking…'}
                </span>
              )}
            </div>

            {/* Active indicator dot */}
            {isActive && <span className="active-dot" />}
          </div>
        )
      })}
    </div>
  )
}
