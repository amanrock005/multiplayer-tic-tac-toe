// src/hooks/useGame.js
// Core game hook: matchmaking queue, WebSocket messages,
// and real-time state synchronisation with the Nakama server.

import { useState, useRef, useCallback, useEffect } from 'react'
import { useNakama } from './useNakama'
import { useAuth }   from '../context/AuthContext'
import { OP, GAME_STATUS } from '../lib/constants'

const EMPTY_STATE = {
  board:        Array(9).fill(null),
  turn:         'X',
  marks:        {},     // { userId: 'X'|'O' }
  players:      {},     // { userId: { name, mark, user_id } }
  status:       'waiting',
  winner:       null,
  winning_line: null,
  move_count:   0,
}

export function useGame() {
  const { session }                      = useAuth()
  const { connectSocket, disconnectSocket, socketRef } = useNakama()

  const [gameStatus, setGameStatus] = useState(GAME_STATUS.IDLE)
  const [gameState,  setGameState]  = useState(EMPTY_STATE)
  const [myMark,     setMyMark]     = useState(null)   // 'X' or 'O'
  const [matchId,    setMatchId]    = useState(null)
  const [error,      setError]      = useState(null)
  const [result,     setResult]     = useState(null)   // { text, type }

  const matchIdRef = useRef(null)  // stable ref used inside callbacks
  const myMarkRef  = useRef(null)

  // Keep refs in sync
  useEffect(() => { matchIdRef.current = matchId }, [matchId])
  useEffect(() => { myMarkRef.current  = myMark  }, [myMark])

  // ── Parse board from server payload ──────────────────────────
  // Server sends board as an object with numeric string keys
  const parseBoard = (raw) => {
    const board = Array(9).fill(null)
    if (!raw) return board
    for (let i = 0; i < 9; i++) {
      board[i] = raw[i] ?? raw[String(i)] ?? null
    }
    return board
  }

  // ── Attach real-time message handlers to socket ──────────────
  const attachHandlers = useCallback((socket) => {
    socket.onmatchdata = (data) => {
      const op = data.op_code

      // Decode binary payload → JSON
      let payload = {}
      try {
        const text = new TextDecoder().decode(data.data)
        payload = JSON.parse(text)
      } catch { return }

      // ── OP_READY / OP_STATE_UPDATE ──────────────────────────
      if (op === OP.READY || op === OP.STATE_UPDATE) {
        const board = parseBoard(payload.board)

        setGameState({
          board,
          turn:         payload.turn         ?? 'X',
          marks:        payload.marks        ?? {},
          players:      payload.players      ?? {},
          status:       payload.status       ?? 'playing',
          winner:       payload.winner       ?? null,
          winning_line: payload.winning_line ?? null,
          move_count:   payload.move_count   ?? 0,
        })

        // Derive my mark from server-assigned marks
        if (session?.user_id && payload.marks) {
          const mark = payload.marks[session.user_id]
          if (mark) {
            setMyMark(mark)
            myMarkRef.current = mark
          }
        }

        if (op === OP.READY) {
          setGameStatus(GAME_STATUS.PLAYING)
        }
      }

      // ── OP_GAME_OVER ────────────────────────────────────────
      if (op === OP.GAME_OVER) {
        setGameState(prev => ({
          ...prev,
          board:        parseBoard(payload.board),
          winner:       payload.winner,
          winning_line: payload.winning_line ?? null,
          status:       'finished',
        }))
        setGameStatus(GAME_STATUS.FINISHED)

        const me = myMarkRef.current
        if (payload.winner === 'draw') {
          setResult({ text: "It's a draw!", type: 'draw' })
        } else if (payload.winner === me) {
          setResult({ text: 'You win! 🎉',  type: 'win'  })
        } else {
          setResult({ text: 'You lose.',     type: 'lose' })
        }
      }

      // ── OP_PLAYER_LEFT ──────────────────────────────────────
      if (op === OP.PLAYER_LEFT) {
        setGameStatus(GAME_STATUS.DISCONNECTED)
        setResult({ text: 'Opponent disconnected. You win by forfeit!', type: 'win' })
      }
    }
  }, [session])

  // ── Find Quick Match ──────────────────────────────────────────
  const findMatch = useCallback(async () => {
    if (!session) return
    setError(null)
    setResult(null)
    setMyMark(null)
    setMatchId(null)
    setGameState(EMPTY_STATE)
    setGameStatus(GAME_STATUS.SEARCHING)

    try {
      const socket = await connectSocket(session)
      attachHandlers(socket)

      // Add matchmaker ticket: min=2, max=2 players, any query
      await socket.addMatchmaker('*', 2, 2, {})

      // Nakama calls onMatchmakerMatched when a pair is found
      socket.onmatchmakermatched = async (matched) => {
        const mid = matched.match_id
        matchIdRef.current = mid
        setMatchId(mid)
        setGameStatus(GAME_STATUS.WAITING)

        // Join the authoritative match — triggers match_join on server
        await socket.joinMatch(mid)
      }
    } catch (err) {
      console.error('[Game] findMatch error:', err)
      setError(err.message || 'Matchmaking failed. Try again.')
      setGameStatus(GAME_STATUS.IDLE)
    }
  }, [session, connectSocket, attachHandlers])

  // ── Send Move ─────────────────────────────────────────────────
  const sendMove = useCallback(async (cellIndex) => {
    const socket = socketRef.current
    const mid    = matchIdRef.current
    if (!socket || !mid) {
      setError('No active connection.')
      return
    }
    try {
      await socket.sendMatchState(
        mid,
        OP.MAKE_MOVE,
        JSON.stringify({ cell: cellIndex })
      )
    } catch (err) {
      console.error('[Game] sendMove error:', err)
      setError('Failed to send move. Check your connection.')
    }
  }, [socketRef])

  // ── Leave / Reset ─────────────────────────────────────────────
  const leaveGame = useCallback(async () => {
    const socket = socketRef.current
    const mid    = matchIdRef.current
    try {
      if (socket && mid) await socket.leaveMatch(mid)
    } catch { /* ignore */ }

    matchIdRef.current = null
    myMarkRef.current  = null
    setMatchId(null)
    setMyMark(null)
    setGameState(EMPTY_STATE)
    setGameStatus(GAME_STATUS.IDLE)
    setResult(null)
    setError(null)
  }, [socketRef])

  // ── Cleanup WebSocket on component unmount ────────────────────
  useEffect(() => {
    return () => { disconnectSocket() }
  }, [disconnectSocket])

  // ── Derived state ─────────────────────────────────────────────
  const isMyTurn = !!(
    session?.user_id &&
    gameState.marks[session.user_id] === gameState.turn &&
    gameStatus === GAME_STATUS.PLAYING
  )

  return {
    // State
    gameStatus,
    gameState,
    matchId,
    myMark,
    isMyTurn,
    error,
    result,
    // Actions
    findMatch,
    sendMove,
    leaveGame,
  }
}