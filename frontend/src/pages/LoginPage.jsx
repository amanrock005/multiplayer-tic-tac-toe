// src/pages/LoginPage.jsx
// Renders the Google Sign-In button and handles the OAuth flow.

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { session, loading, signInWithGoogle, authError } = useAuth()
  const navigate = useNavigate()
  const btnRef   = useRef(null)

  // Already authenticated → skip login
  useEffect(() => {
    if (!loading && session) navigate('/lobby', { replace: true })
  }, [session, loading, navigate])

  // Mount the Google Sign-In button once auth state is settled
  useEffect(() => {
    if (loading) return

    function mountGSI() {
      if (!window.google || !btnRef.current) return
      window.google.accounts.id.initialize({
        client_id:            import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback:             async ({ credential }) => {
          try {
            await signInWithGoogle(credential)
            navigate('/lobby')
          } catch { /* authError shown via context */ }
        },
        auto_select:          false,
        cancel_on_tap_outside: true,
      })
      window.google.accounts.id.renderButton(btnRef.current, {
        theme:  'filled_black',
        size:   'large',
        shape:  'pill',
        text:   'continue_with',
        width:  '100%',
      })
    }

    // Dynamically load the GSI script
    if (!document.getElementById('gsi-script')) {
      const s = document.createElement('script')
      s.id     = 'gsi-script'
      s.src    = 'https://accounts.google.com/gsi/client'
      s.async  = true
      s.defer  = true
      s.onload = mountGSI
      document.head.appendChild(s)
    } else if (window.google) {
      mountGSI()
    }
  }, [loading, signInWithGoogle, navigate])

  if (loading) return <div className="page-center"><div className="spinner" /></div>

  return (
    <div className="login-root">
      {/* Animated grid background */}
      <div className="login-bg" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className={`bg-cell bg-cell-${i}`} />
        ))}
      </div>

      <div className="login-card">
        <div className="login-logo">
          <span className="logo-x">X</span>
          <span className="logo-divider">/</span>
          <span className="logo-o">O</span>
        </div>

        <h1 className="login-title">Tic-Tac-Toe</h1>
        <p className="login-sub">
          Real-time multiplayer.<br />
          Server-authoritative. Zero cheating.
        </p>

        {authError && (
          <div className="error-banner" role="alert">{authError}</div>
        )}

        <div className="gsi-wrapper" ref={btnRef} />

        <p className="login-legal">
          Sign in with Google to find opponents and track your games.
          We only store your Google display name and avatar.
        </p>
      </div>
    </div>
  )
}
