const BASE = import.meta.env.VITE_API_URL || '/api'
import { authHeaders } from './auth.js'

async function parseError(res) {
  const text = await res.text()
  try {
    const data = JSON.parse(text)
    return data.error || res.statusText
  } catch {
    return text || res.statusText
  }
}

function base(tournamentId) {
  return `${BASE}/tournament/${tournamentId}/league`
}

export async function getConfig(tournamentId) {
  const res = await fetch(`${base(tournamentId)}/config`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function updateConfig(tournamentId, payload) {
  const res = await fetch(`${base(tournamentId)}/config`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function generateFixture(tournamentId, { round_trip } = {}) {
  const res = await fetch(`${base(tournamentId)}/generate-fixture`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ round_trip: round_trip ?? false }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

function jsonHeaders() {
  return { 'Content-Type': 'application/json', ...authHeaders() }
}

export async function getZones(tournamentId) {
  const res = await fetch(`${base(tournamentId)}/zones`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function createZone(tournamentId, { name, sort_order }) {
  const res = await fetch(`${base(tournamentId)}/zones`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ name: name || 'Zona', sort_order: sort_order ?? 0 }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function updateZone(tournamentId, zoneId, payload) {
  const res = await fetch(`${base(tournamentId)}/zones/${zoneId}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function deleteZone(tournamentId, zoneId) {
  const res = await fetch(`${base(tournamentId)}/zones/${zoneId}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok && res.status !== 204) throw new Error(await parseError(res))
}

export async function getCurrentMatchday(tournamentId) {
  const res = await fetch(`${base(tournamentId)}/current-matchday`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function getTeams(tournamentId, { zoneId } = {}) {
  const url = zoneId ? `${base(tournamentId)}/teams?zone_id=${encodeURIComponent(zoneId)}` : `${base(tournamentId)}/teams`
  const res = await fetch(url)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Sortea los equipos y crea zonas automáticamente. num_zones = cantidad de grupos. */
export async function drawZones(tournamentId, numZones) {
  const res = await fetch(`${base(tournamentId)}/draw-zones`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ num_zones: numZones }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function createTeam(tournamentId, { name, shield_url, zone_id }) {
  const res = await fetch(`${base(tournamentId)}/teams`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ name: name || 'Equipo', shield_url: shield_url || null, zone_id: zone_id || null }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function updateTeam(tournamentId, teamId, payload) {
  const res = await fetch(`${base(tournamentId)}/teams/${teamId}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function deleteTeam(tournamentId, teamId) {
  const res = await fetch(`${base(tournamentId)}/teams/${teamId}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok && res.status !== 204) throw new Error(await parseError(res))
}

export async function getTeamPlayers(tournamentId, teamId) {
  const res = await fetch(`${base(tournamentId)}/teams/${teamId}/players`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Detalle completo del equipo: jugadores, goleadores, tarjetas, próxima/anterior/actual fecha */
export async function getTeamDetail(tournamentId, teamId) {
  const res = await fetch(`${base(tournamentId)}/teams/${teamId}/detail`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function getPlayersByTeams(tournamentId, teamIds) {
  if (!teamIds?.length) return {}
  const url = `${base(tournamentId)}/players?team_ids=${teamIds.map(encodeURIComponent).join(',')}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function createTeamPlayer(tournamentId, teamId, { player_name, dni, shirt_number, role }) {
  const res = await fetch(`${base(tournamentId)}/teams/${teamId}/players`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({
      player_name: player_name?.trim() || 'Jugador',
      dni: dni?.trim() || null,
      shirt_number: shirt_number || null,
      role: role || 'player',
    }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function updateTeamPlayer(tournamentId, teamId, playerId, payload) {
  const res = await fetch(`${base(tournamentId)}/teams/${teamId}/players/${playerId}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function deleteTeamPlayer(tournamentId, teamId, playerId) {
  const res = await fetch(`${base(tournamentId)}/teams/${teamId}/players/${playerId}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok && res.status !== 204) throw new Error(await parseError(res))
}

export async function getMatchdays(tournamentId) {
  const res = await fetch(`${base(tournamentId)}/matchdays`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function createMatchday(tournamentId, number) {
  const res = await fetch(`${base(tournamentId)}/matchdays`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ number }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function deleteMatchday(tournamentId, matchdayId) {
  const res = await fetch(`${base(tournamentId)}/matchdays/${matchdayId}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok && res.status !== 204) throw new Error(await parseError(res))
}

export async function getMatches(tournamentId, matchdayId, { zoneId } = {}) {
  const url = zoneId ? `${base(tournamentId)}/matchdays/${matchdayId}/matches?zone_id=${encodeURIComponent(zoneId)}` : `${base(tournamentId)}/matchdays/${matchdayId}/matches`
  const res = await fetch(url)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function createMatch(tournamentId, matchdayId, { home_team_id, away_team_id, played_at }) {
  const res = await fetch(`${base(tournamentId)}/matchdays/${matchdayId}/matches`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ home_team_id, away_team_id, played_at: played_at || null }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function updateMatch(tournamentId, matchId, payload) {
  const res = await fetch(`${base(tournamentId)}/matches/${matchId}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function deleteMatch(tournamentId, matchId) {
  const res = await fetch(`${base(tournamentId)}/matches/${matchId}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok && res.status !== 204) throw new Error(await parseError(res))
}

export async function getGoals(tournamentId, matchId) {
  const res = await fetch(`${base(tournamentId)}/matches/${matchId}/goals`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function addGoal(tournamentId, matchId, { player_name, team_id, goals }) {
  const res = await fetch(`${base(tournamentId)}/matches/${matchId}/goals`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ player_name, team_id, goals: goals != null ? Number(goals) : 1 }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function deleteGoal(tournamentId, goalId) {
  const res = await fetch(`${base(tournamentId)}/goals/${goalId}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok && res.status !== 204) throw new Error(await parseError(res))
}

export async function getCards(tournamentId, matchId) {
  const res = await fetch(`${base(tournamentId)}/matches/${matchId}/cards`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function addCard(tournamentId, matchId, { player_name, team_id, card_type }) {
  const res = await fetch(`${base(tournamentId)}/matches/${matchId}/cards`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ player_name, team_id, card_type }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function deleteCard(tournamentId, cardId) {
  const res = await fetch(`${base(tournamentId)}/cards/${cardId}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok && res.status !== 204) throw new Error(await parseError(res))
}

export async function getStandings(tournamentId, { zoneId } = {}) {
  const url = zoneId ? `${base(tournamentId)}/standings?zone_id=${encodeURIComponent(zoneId)}` : `${base(tournamentId)}/standings`
  const res = await fetch(url)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function getScorers(tournamentId, { zoneId } = {}) {
  const url = zoneId ? `${base(tournamentId)}/scorers?zone_id=${encodeURIComponent(zoneId)}` : `${base(tournamentId)}/scorers`
  const res = await fetch(url)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function getDiscipline(tournamentId, { zoneId } = {}) {
  const url = zoneId ? `${base(tournamentId)}/discipline?zone_id=${encodeURIComponent(zoneId)}` : `${base(tournamentId)}/discipline`
  const res = await fetch(url)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Obtiene el cuadro de playoffs (rondas y partidos). */
export async function getPlayoffBracket(tournamentId) {
  const res = await fetch(`${base(tournamentId)}/playoff/bracket`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Genera el cuadro de playoffs. Requiere qualify_per_zone en config (ej. 2 primeros por grupo). */
export async function generatePlayoff(tournamentId) {
  const res = await fetch(`${base(tournamentId)}/playoff/generate`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({}),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Actualiza un partido de playoff (resultado, etc.). */
export async function updatePlayoffMatch(tournamentId, matchId, { home_score, away_score, status, played_at }) {
  const res = await fetch(`${base(tournamentId)}/playoff/matches/${matchId}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ home_score, away_score, status, played_at }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}
