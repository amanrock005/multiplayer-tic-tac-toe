// src/hooks/useNakama.js
// Provides a stable Nakama Client singleton and manages the
// WebSocket connection lifecycle across the app.

import { useRef, useCallback } from 'react'
import { Client } from "@heroiclabs/nakama-js";

// ── Singleton client (created once, lives for app lifetime) ──
let _client = null
function getClient() {
  if (!_client) {
    _client = new Client(
      import.meta.env.VITE_NAKAMA_SERVER_KEY,
      import.meta.env.VITE_NAKAMA_HOST,
      import.meta.env.VITE_NAKAMA_PORT,
      import.meta.env.VITE_NAKAMA_USE_SSL === 'true'
    )
  }
  return _client
}

export function useNakama() {
  const socketRef = useRef(null)
  const client    = getClient()

  // Create + connect WebSocket (idempotent)
  const connectSocket = useCallback(async (session) => {
    if (socketRef.current) return socketRef.current

    const useSSL  = import.meta.env.VITE_NAKAMA_USE_SSL === 'true'
    const socket  = client.createSocket(useSSL, false)

    socket.onclose      = () => { socketRef.current = null }
    socket.ondisconnect = () => { socketRef.current = null }

    await socket.connect(session, true)
    socketRef.current = socket
    return socket
  }, [client])

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }, [])

  return { client, socketRef, connectSocket, disconnectSocket }
}

// ── Session helpers ───────────────────────────────────────────
const KEY = 'nk_session'

export function persistSession(session) {
  localStorage.setItem(KEY, JSON.stringify({
    token:         session.token,
    refresh_token: session.refresh_token,
  }))
}

export function retrieveSession() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function dropSession() {
  localStorage.removeItem(KEY)
}