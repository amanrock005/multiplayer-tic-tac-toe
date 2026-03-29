// src/lib/constants.js
// Must stay in sync with tictactoe_match.lua op-code values

export const OP = {
  MAKE_MOVE:    1,   // client → server  { cell: 0-8 }
  STATE_UPDATE: 2,   // server → clients  full GameState
  GAME_OVER:    3,   // server → clients  { winner, winning_line, board }
  PLAYER_LEFT:  4,   // server → clients  { winner, reason }
  READY:        5,   // server → clients  game starts
}

export const GAME_STATUS = {
  IDLE:         'idle',         // not in any game
  SEARCHING:    'searching',    // in matchmaker queue
  WAITING:      'waiting',      // match found, waiting for opponent
  PLAYING:      'playing',      // active game
  FINISHED:     'finished',     // game over (normal)
  DISCONNECTED: 'disconnected', // opponent left
}

export const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
]