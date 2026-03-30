// src/hooks/useNakama.js
// Provides a stable Nakama Client singleton and manages the
// WebSocket connection lifecycle across the app.

import { useRef, useCallback } from 'react'
import { Client } from "@heroiclabs/nakama-js";

// ── Singleton client (created once, lives for app lifetime) ──
let _client = null

/** Nakama Client builds `scheme + host + ':' + port`. Host must NOT include https:// or a path. */
function normalizeNakamaHost(raw) {
  if (raw == null || String(raw).trim() === '') return raw
  let h = String(raw).trim()
  h = h.replace(/^https:\/\//i, '').replace(/^http:\/\//i, '')
  h = h.replace(/\/.*$/, '')
  return h
}

function useSslFromEnv() {
  const v = import.meta.env.VITE_NAKAMA_USE_SSL
  return v === 'true' || v === '1' || String(v).toLowerCase() === 'yes'
}

function getClient() {
  if (!_client) {
    const host = normalizeNakamaHost(import.meta.env.VITE_NAKAMA_HOST)
    const port = String(import.meta.env.VITE_NAKAMA_PORT ?? '7350').trim()
    _client = new Client(
      import.meta.env.VITE_NAKAMA_SERVER_KEY,
      host,
      port,
      useSslFromEnv()
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

    const useSSL  = useSslFromEnv()
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