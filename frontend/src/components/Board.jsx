// src/components/Board.jsx
// Renders the 3×3 grid. Has zero game logic — only displays
// state received from the server and fires click callbacks.

export default function Board({ board, winningLine, onCellClick, isMyTurn, disabled }) {
  const winSet = new Set(winningLine || [])

  return (
    <div
      className={[
        'board',
        isMyTurn && !disabled ? 'board--active' : 'board--passive',
      ].join(' ')}
      aria-label="Tic-Tac-Toe board"
    >
      {board.map((cell, idx) => {
        const isWinCell  = winSet.has(idx)
        const isPlayable = !cell && isMyTurn && !disabled

        return (
          <button
            key={idx}
            type="button"
            className={[
              'cell',
              cell         ? `cell--${cell.toLowerCase()}` : '',
              isWinCell    ? 'cell--winning'               : '',
              isPlayable   ? 'cell--playable'              : '',
            ].filter(Boolean).join(' ')}
            style={{
              gridColumn: (idx % 3) + 1,
              gridRow: Math.floor(idx / 3) + 1,
            }}
            onClick={() => isPlayable && onCellClick(idx)}
            disabled={!isPlayable}
            aria-label={
              cell
                ? `Cell ${idx + 1}: ${cell}`
                : `Cell ${idx + 1}: empty${isPlayable ? ', click to play' : ''}`
            }
          >
            {cell && (
              <span className={`mark mark--${cell.toLowerCase()}`}>
                {cell}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
