// src/components/Cell.jsx
// Individual board cell — extracted for clarity.
// (Board.jsx uses inline cells for simplicity; this is an
//  alternative if you want per-cell animation refs.)

export default function Cell({ value, index, isWinning, isPlayable, onClick }) {
  return (
    <button
      className={[
        'cell',
        value      ? `cell--${value.toLowerCase()}` : '',
        isWinning  ? 'cell--winning'                : '',
        isPlayable ? 'cell--playable'               : '',
      ].filter(Boolean).join(' ')}
      onClick={() => isPlayable && onClick(index)}
      disabled={!isPlayable}
      aria-label={
        value
          ? `Cell ${index + 1}: ${value}`
          : `Cell ${index + 1}: empty${isPlayable ? ', click to play' : ''}`
      }
    >
      {value && (
        <span className={`mark mark--${value.toLowerCase()}`}>{value}</span>
      )}
    </button>
  )
}
