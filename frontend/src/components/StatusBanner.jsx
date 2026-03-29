// src/components/StatusBanner.jsx
// One-line contextual status message shown above the board.

import { GAME_STATUS } from '../lib/constants'

export default function StatusBanner({ gameStatus, isMyTurn, myMark, error }) {
  if (error) {
    return <div className="status-banner status-banner--error">{error}</div>
  }

  let text  = ''
  let mod   = ''

  switch (gameStatus) {
    case GAME_STATUS.SEARCHING:
      text = 'Finding an opponent…'
      mod  = 'searching'
      break
    case GAME_STATUS.WAITING:
      text = 'Opponent connecting…'
      mod  = 'waiting'
      break
    case GAME_STATUS.PLAYING:
      text = isMyTurn
        ? `Your turn · You are ${myMark}`
        : "Opponent's turn"
      mod  = isMyTurn ? 'your-turn' : 'their-turn'
      break
    case GAME_STATUS.FINISHED:
    case GAME_STATUS.DISCONNECTED:
      text = 'Game over'
      mod  = 'finished'
      break
    default:
      return null
  }

  return (
    <div className={`status-banner status-banner--${mod}`}>
      {text}
    </div>
  )
}
