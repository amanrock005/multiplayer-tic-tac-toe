# Multiplayer Tic-Tac-Toe — Server-Authoritative Architecture

## Live Link
https://multiplayer-tic-tac-toe-1-gg12.onrender.com

## Folder Structure

```
tictactoe/
├── nakama/                          # Backend — Nakama server
│   └── modules/
│       ├── main.lua                 # Entry point — registers match handler + RPCs
│       └── tictactoe_match.lua      # Server-authoritative game logic
│
├── frontend/                        # Frontend — React + Vite
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── main.jsx                 # React entry point
│       ├── App.jsx                  # Router + providers
│       │
│       ├── context/
│       │   ├── AuthContext.jsx      # Google OAuth + Nakama session
│       │   └── GameContext.jsx      # Global game state provider
│       │
│       ├── hooks/
│       │   ├── useNakama.js         # Nakama client singleton + socket
│       │   └── useGame.js           # Matchmaking + real-time game logic
│       │
│       ├── pages/
│       │   ├── LoginPage.jsx        # Google Sign-In screen
│       │   ├── LobbyPage.jsx        # Find match / waiting room
│       │   └── GamePage.jsx         # Active game board
│       │
│       ├── components/
│       │   ├── Board.jsx            # 3×3 grid — pure display
│       │   ├── Cell.jsx             # Individual cell with animations
│       │   ├── PlayerBar.jsx        # Both players + turn indicator
│       │   ├── StatusBanner.jsx     # Game status messages
│       │   ├── ResultOverlay.jsx    # Win/Lose/Draw overlay
│       │   └── ProtectedRoute.jsx   # Auth guard for routes
│       │
│       └── styles/
│           └── global.css           # Full design system
│

```

## Architecture — How It Works

```
Player A (React)          Nakama Server (Lua)         Player B (React)
     |                          |                           |
     |── authenticateGoogle ───>|                           |
     |<─ session token ─────────|                           |
     |                          |<── authenticateGoogle ────|
     |                          |─── session token ────────>|
     |                          |                           |
     |── addMatchmakerTicket ──>|                           |
     |                          |<── addMatchmakerTicket ───|
     |                          |                           |
     |                          |  [Nakama pairs players]   |
     |                          |── match_create ──────────>|
     |<─ onMatchmakerMatched ───|── onMatchmakerMatched ───>|
     |                          |                           |
     |── joinMatch ────────────>|<── joinMatch ─────────────|
     |<─ OP_READY (state) ──────|── OP_READY (state) ──────>|
     |                          |                           |
     |── OP_MAKE_MOVE (cell:4) >|  [Server validates]       |
     |                          |  [Server checks: turn?]   |
     |                          |  [Server checks: empty?]  |
     |                          |  [Server checks: winner?] |
     |<─ OP_STATE_UPDATE ───────|── OP_STATE_UPDATE ───────>|
     |                          |                           |
```

**Key principle**: The client NEVER computes game outcomes.
It only sends intents. The server validates, applies, and broadcasts.
