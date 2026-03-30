// src/context/AuthContext.jsx
// Manages Google OAuth → Nakama authentication and session refresh.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNakama, persistSession, retrieveSession, dropSession } from '../hooks/useNakama'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const { client }      = useNakama()
  const [session,  setSession]  = useState(null)
  const [account,  setAccount]  = useState(null)
  const [loading,  setLoading]  = useState(true)   // resolves after restore attempt
  const [authError, setAuthError] = useState(null)

  // ── Restore session on mount ────────────────────────────────
  useEffect(() => {
    async function restore() {
      const stored = retrieveSession()
      if (!stored) { setLoading(false); return }
      try {
        // Refresh the token so we get a valid session object
        const refreshed = await client.sessionRefresh(stored)
        persistSession(refreshed)
        setSession(refreshed)
        const acct = await client.getAccount(refreshed)
        setAccount(acct)
      } catch {
        dropSession()  // token expired / invalid
      } finally {
        setLoading(false)
      }
    }
    restore()
  }, [client])

  // ── Sign in with Google ID token ────────────────────────────
  // Called from LoginPage with the credential from the Google GSI button
  const signInWithGoogle = useCallback(async (googleIdToken) => {
    setAuthError(null)
    try {
      const sess = await client.authenticateGoogle(
        googleIdToken,
        true,   // create account if first time
        null    // username from Google profile
      )
      persistSession(sess)
      setSession(sess)
      const acct = await client.getAccount(sess)
      setAccount(acct)
      return sess
    } catch (err) {
      // nakama-js throws the raw fetch Response on HTTP errors — no .message
      let msg = typeof err?.message === 'string' ? err.message : ''
      const isResponse =
        err &&
        typeof err.status === 'number' &&
        typeof err.json === 'function'
      if (!msg && isResponse) {
        try {
          const body = await err.clone().json()
          msg =
            body?.message ||
            body?.error ||
            (typeof body?.error === 'object' && body?.error?.message) ||
            ''
        } catch {
          try {
            const text = await err.clone().text()
            msg = text?.slice(0, 500) || ''
          } catch {
            msg = err.statusText || `HTTP ${err.status}`
          }
        }
        if (!msg) msg = `Request failed (${err.status})`
      }
      if (!msg && err != null) {
        msg = String(err)
      }
      setAuthError(msg || 'Authentication failed')
      throw err
    }
  }, [client])

  // ── Sign out ─────────────────────────────────────────────────
  const signOut = useCallback(() => {
    dropSession()
    setSession(null)
    setAccount(null)
  }, [])

  return (
    <AuthCtx.Provider value={{ session, account, loading, authError, signInWithGoogle, signOut }}>
      {children}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
