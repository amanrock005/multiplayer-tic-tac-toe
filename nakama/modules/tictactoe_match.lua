-- =============================================================
-- tictactoe_match.lua  —  Server-authoritative game logic
--
-- ALL game state lives here. Clients only send move intents.
-- The server validates every move before applying it.
-- No client can cheat — win detection, turn order, and board
-- state are all computed and stored server-side only.
-- =============================================================

local nk = require("nakama")

-- ── Op-codes (must match constants in frontend/src/lib/constants.js) ──
local OP_MAKE_MOVE    = 1   -- client → server  { cell: 0-8 }
local OP_STATE_UPDATE = 2   -- server → clients  full game state
local OP_GAME_OVER    = 3   -- server → clients  { winner, board }
local OP_PLAYER_LEFT  = 4   -- server → clients  { winner, reason }
local OP_READY        = 5   -- server → clients  both players connected

-- ── All 8 winning line combinations (0-indexed, row-major) ───
local WIN_LINES = {
  {0,1,2}, {3,4,5}, {6,7,8},   -- rows
  {0,3,6}, {1,4,7}, {2,5,8},   -- cols
  {0,4,8}, {2,4,6},            -- diagonals
}

-- ─────────────────────────────────────────────────────────────
-- HELPER: check_winner
-- Returns "X", "O", "draw", or nil (game continues)
-- ─────────────────────────────────────────────────────────────
local function check_winner(board)
  for _, line in ipairs(WIN_LINES) do
    local a, b, c = line[1], line[2], line[3]
    local va, vb, vc = board[a], board[b], board[c]
    if va ~= nil and va == vb and vb == vc then
      return va, line   -- return winner mark + winning line
    end
  end
  -- Check draw: all cells filled, no winner
  for i = 0, 8 do
    if board[i] == nil then return nil, nil end
  end
  return "draw", nil
end

-- ─────────────────────────────────────────────────────────────
-- HELPER: board_to_json_array
-- Lua board uses keys 0–8; nk.json_encode on that map can reorder keys
-- or omit index 0, so the client grid no longer matches click indices.
-- Force a 1..9 Lua array → JSON [c0, c1, …, c8] aligned with JS board[0..8].
-- ─────────────────────────────────────────────────────────────
local function board_to_json_array(board)
  local arr = {}
  for i = 0, 8 do
    arr[i + 1] = board[i]
  end
  return arr
end

-- ─────────────────────────────────────────────────────────────
-- HELPER: build_state_payload
-- Serialises full game state for broadcast
-- ─────────────────────────────────────────────────────────────
local function build_state_payload(state)
  return nk.json_encode({
    board        = board_to_json_array(state.board),
    turn         = state.turn,
    marks        = state.marks,
    players      = state.players,
    status       = state.status,
    winner       = state.winner,
    winning_line = state.winning_line,
    move_count   = state.move_count,
  })
end

-- =============================================================
-- match_init
-- Called once when the match is created by nk.match_create()
-- =============================================================
local function match_init(context, setupstate)
  local state = {
    -- Board: keys 0-8, values "X" | "O" | nil
    board        = {},
    turn         = "X",        -- X always goes first
    marks        = {},         -- { user_id -> "X" | "O" }
    players      = {},         -- { user_id -> { name, mark } }
    presences    = {},         -- { user_id -> presence }
    status       = "waiting",  -- waiting | playing | finished
    winner       = nil,
    winning_line = nil,
    move_count   = 0,
    _finish_tick = 0,          -- countdown after game ends
  }

  -- Initialise all cells to nil
  for i = 0, 8 do state.board[i] = nil end

  local tick_rate = 10  -- 10 Hz is plenty for turn-based
  local label     = "tictactoe"

  nk.logger_info("[TTT] match_init — match created")
  return state, tick_rate, label
end

-- =============================================================
-- match_join_attempt
-- Gate-keeps each incoming join. Return false to reject.
-- =============================================================
local function match_join_attempt(context, dispatcher, tick, state, presence, metadata)
  -- Count current players
  local count = 0
  for _ in pairs(state.presences) do count = count + 1 end

  if count >= 2 then
    return state, false, "Match is full (2/2)"
  end
  if state.status == "finished" then
    return state, false, "Match has already ended"
  end

  return state, true   -- allow join
end

-- =============================================================
-- match_join
-- Called after a player successfully joins the match
-- =============================================================
local function match_join(context, dispatcher, tick, state, presences)
  for _, presence in ipairs(presences) do
    -- Register presence
    state.presences[presence.user_id] = presence

    -- Assign mark: first player = X, second = O
    local player_count = 0
    for _ in pairs(state.marks) do player_count = player_count + 1 end
    local mark = (player_count == 0) and "X" or "O"
    state.marks[presence.user_id] = mark

    -- Fetch display name from Nakama user store
    local display_name = presence.username
    local ok, users = pcall(nk.users_get_id, { presence.user_id })
    if ok and users and users[1] then
      display_name = users[1].display_name or presence.username
    end

    state.players[presence.user_id] = {
      name    = display_name,
      mark    = mark,
      user_id = presence.user_id,
    }

    nk.logger_info(string.format("[TTT] %s joined as %s", display_name, mark))
  end

  -- Check if we now have 2 players → start the game
  local total = 0
  for _ in pairs(state.presences) do total = total + 1 end

  if total == 2 then
    state.status = "playing"
    nk.logger_info("[TTT] Both players ready — game starting")

    -- Broadcast OP_READY with full initial state
    dispatcher.broadcast_message(
      OP_READY,
      build_state_payload(state),
      nil, nil, true  -- reliable delivery
    )
  end

  return state
end

-- =============================================================
-- match_loop
-- Called every tick. Processes all queued client messages.
-- =============================================================
local function match_loop(context, dispatcher, tick, state, messages)

  for _, msg in ipairs(messages) do
    local op      = msg.op_code
    local user_id = msg.sender.user_id

    -- ─────────────────────────────────────────────────────────
    -- Handle OP_MAKE_MOVE
    -- ─────────────────────────────────────────────────────────
    if op == OP_MAKE_MOVE then

      -- [Guard 1] Game must be active
      if state.status ~= "playing" then
        nk.logger_warn("[TTT] Move rejected — game not active")
        goto continue
      end

      -- [Guard 2] Must be this player's turn
      local my_mark = state.marks[user_id]
      if my_mark == nil then
        nk.logger_warn("[TTT] Move rejected — unknown player")
        goto continue
      end
      if my_mark ~= state.turn then
        nk.logger_warn(string.format(
          "[TTT] Move rejected — not %s's turn (current: %s)", my_mark, state.turn
        ))
        goto continue
      end

      -- [Guard 3] Parse payload
      local ok, payload = pcall(nk.json_decode, msg.data)
      if not ok or payload == nil or payload.cell == nil then
        nk.logger_warn("[TTT] Move rejected — bad payload")
        goto continue
      end

      local cell = tonumber(payload.cell)

      -- [Guard 4] Cell must be 0–8
      if cell == nil or cell < 0 or cell > 8 then
        nk.logger_warn("[TTT] Move rejected — cell out of range: " .. tostring(cell))
        goto continue
      end

      -- [Guard 5] Cell must be empty
      if state.board[cell] ~= nil then
        nk.logger_warn("[TTT] Move rejected — cell " .. cell .. " already occupied")
        goto continue
      end

      -- ✅ Valid move — apply it
      state.board[cell] = my_mark
      state.move_count  = state.move_count + 1
      state.turn        = (my_mark == "X") and "O" or "X"

      -- Check for terminal state
      local result, winning_line = check_winner(state.board)

      if result ~= nil then
        -- ── Game over ─────────────────────────────────────────
        state.status       = "finished"
        state.winner       = result
        state.winning_line = winning_line

        nk.logger_info("[TTT] Game over — winner: " .. result)

        -- Broadcast final board state
        dispatcher.broadcast_message(
          OP_STATE_UPDATE,
          build_state_payload(state),
          nil, nil, true
        )
        -- Broadcast dedicated game-over message
        dispatcher.broadcast_message(
          OP_GAME_OVER,
          nk.json_encode({
            winner       = result,
            winning_line = winning_line,
            board        = board_to_json_array(state.board),
          }),
          nil, nil, true
        )
      else
        -- ── Game continues ────────────────────────────────────
        dispatcher.broadcast_message(
          OP_STATE_UPDATE,
          build_state_payload(state),
          nil, nil, true
        )
      end

      ::continue::
    end
    -- (Add more op_code handlers here if needed)
  end

  -- After game ends, hold the match open for 6 seconds (60 ticks)
  -- so clients can display the result, then terminate cleanly.
  if state.status == "finished" then
    state._finish_tick = state._finish_tick + 1
    if state._finish_tick >= 60 then
      nk.logger_info("[TTT] Match terminating after result display window")
      return nil  -- returning nil terminates the match
    end
  end

  return state
end

-- =============================================================
-- match_leave
-- Called when a player disconnects or explicitly leaves
-- =============================================================
local function match_leave(context, dispatcher, tick, state, presences)
  for _, presence in ipairs(presences) do
    nk.logger_info("[TTT] Player left: " .. presence.username)
    state.presences[presence.user_id] = nil
    state.players[presence.user_id]   = nil
  end

  -- Count remaining players
  local remaining = 0
  local remaining_mark = nil
  for uid, _ in pairs(state.presences) do
    remaining = remaining + 1
    remaining_mark = state.marks[uid]
  end

  -- If game was live, award win to remaining player by forfeit
  if state.status == "playing" and remaining == 1 then
    state.status = "finished"
    state.winner = remaining_mark

    nk.logger_info("[TTT] Forfeit win for: " .. (remaining_mark or "?"))

    dispatcher.broadcast_message(
      OP_PLAYER_LEFT,
      nk.json_encode({
        winner = remaining_mark,
        reason = "opponent_disconnected",
      }),
      nil, nil, true
    )
  end

  -- Terminate if everyone left
  if remaining == 0 then
    return nil
  end

  return state
end

-- =============================================================
-- match_signal  (unused — kept for completeness)
-- =============================================================
local function match_signal(context, dispatcher, tick, state, data)
  return state, ""
end

-- =============================================================
-- match_terminate
-- =============================================================
local function match_terminate(context, dispatcher, tick, state, grace_seconds)
  nk.logger_info("[TTT] match_terminate called")
  return state
end

-- Export all handlers
return {
  match_init         = match_init,
  match_join_attempt = match_join_attempt,
  match_join         = match_join,
  match_loop         = match_loop,
  match_leave        = match_leave,
  match_signal       = match_signal,
  match_terminate    = match_terminate,
}