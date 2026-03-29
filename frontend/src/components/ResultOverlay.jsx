// src/components/ResultOverlay.jsx
// Full-screen overlay shown when the game ends.
// Animates in and offers "Back to Lobby" action.

export default function ResultOverlay({ result, onLobby }) {
  const iconMap = { win: '🏆', lose: '💀', draw: '🤝' }
  const icon    = iconMap[result.type] || '🎮'

  return (
    <div className="result-overlay" role="dialog" aria-modal="true">
      <div className={`result-card result-card--${result.type}`}>
        <span className="result-icon" aria-hidden="true">{icon}</span>
        <h2 className="result-text">{result.text}</h2>

        <div className="result-actions">
          <button className="btn-primary" onClick={onLobby}>
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  )
}
