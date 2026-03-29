-- =============================================================
-- main.lua  —  Nakama server entry point
-- Registers matchmaker hook + RPCs (match module: tictactoe_match.lua)
-- =============================================================

local nk = require("nakama")

-- Match logic lives in tictactoe_match.lua. Nakama 3.x loads it by module
-- name (file name without .lua) when creating a match — no nk.register_match.

-- ── 1. Matchmaker paired callback ────────────────────────────
-- Nakama calls this when it successfully pairs 2 players.
-- We create a fresh authoritative match and return its ID.
nk.register_matchmaker_matched(function(context, matchmaker_results)
  local usernames = {}
  for _, res in ipairs(matchmaker_results) do
    table.insert(usernames, res.presence.username)
  end
  nk.logger_info("[TTT] Paired: " .. table.concat(usernames, " vs "))

  local match_id = nk.match_create("tictactoe_match", {})
  return match_id
end)

-- ── 2. RPC: create_match ─────────────────────────────────────
local function rpc_create_match(context, payload)
  local match_id = nk.match_create("tictactoe_match", {})
  return nk.json_encode({ match_id = match_id })
end
nk.register_rpc(rpc_create_match, "create_match")

-- ── 3. RPC: find_match ───────────────────────────────────────
local function rpc_find_match(context, payload)
  local matches = nk.match_list(10, true, "tictactoe", nil, 0, 1)
  local result  = {}
  for _, m in ipairs(matches) do
    table.insert(result, { match_id = m.match_id, size = m.size })
  end
  return nk.json_encode({ matches = result })
end
nk.register_rpc(rpc_find_match, "find_match")

nk.logger_info("[TTT] Server module loaded")