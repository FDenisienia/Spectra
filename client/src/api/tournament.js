// En producción (Netlify) usar VITE_API_URL; en dev usa proxy /api → localhost:3000
const BASE = import.meta.env.VITE_API_URL || '/api'
import { authHeaders } from './auth.js'

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  console.log('[Spectra] API base:', BASE)
}

async function parseError(res) {
  const text = await res.text()
  try {
    const data = JSON.parse(text)
    return data.error || res.statusText
  } catch {
    return text || res.statusText
  }
}

function tournamentBase(id) {
  return `${BASE}/tournament/${id}`
}

function jsonHeaders() {
  return { 'Content-Type': 'application/json', ...authHeaders() }
}

// --- Ranking general entre torneos ---

export async function getGlobalRanking() {
  const res = await fetch(`${BASE}/ranking/global`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

// --- Lista y administración de torneos ---

export async function getTournaments(status = null) {
  const url = status ? `${BASE}/tournaments?status=${encodeURIComponent(status)}` : `${BASE}/tournaments`
  const res = await fetch(url)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function createTournament(data) {
  const body = typeof data === 'string' || data == null ? { name: data } : data
  const res = await fetch(`${BASE}/tournaments`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function getTournament(id) {
  const res = await fetch(`${BASE}/tournament/${id}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function updateTournament(id, payload) {
  const res = await fetch(`${BASE}/tournament/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function deleteTournament(id) {
  const res = await fetch(`${BASE}/tournament/${id}`, { method: 'DELETE', headers: authHeaders() })
  if (!res.ok && res.status !== 204) throw new Error(await parseError(res))
}

// --- Estado y acciones de un torneo (requieren id) ---

export async function getState(tournamentId) {
  const res = await fetch(`${tournamentBase(tournamentId)}/state`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function getRanking(tournamentId) {
  const res = await fetch(`${tournamentBase(tournamentId)}/ranking`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function reset(tournamentId) {
  const res = await fetch(`${tournamentBase(tournamentId)}/reset`, { method: 'POST', headers: authHeaders() })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function setConfig(tournamentId, numCourts, numPlayers) {
  const res = await fetch(`${tournamentBase(tournamentId)}/config`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ numCourts, numPlayers }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function addPlayers(tournamentId, names) {
  const res = await fetch(`${tournamentBase(tournamentId)}/players`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ names }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function startDate(tournamentId) {
  const res = await fetch(`${tournamentBase(tournamentId)}/date/start`, { method: 'POST', headers: authHeaders() })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function setMatchScore(tournamentId, matchId, setIndex, pair1Games, pair2Games) {
  const res = await fetch(`${tournamentBase(tournamentId)}/match/${matchId}/score`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ setIndex, pair1Games, pair2Games }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Envía los 3 sets de un partido en una sola petición (más rápido). */
export async function setMatchScores(tournamentId, matchId, sets) {
  const res = await fetch(`${tournamentBase(tournamentId)}/match/${matchId}/scores`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ sets }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function completeMatch(tournamentId, matchId) {
  const res = await fetch(`${tournamentBase(tournamentId)}/match/${matchId}/complete`, { method: 'POST', headers: authHeaders() })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function canCompleteDate(tournamentId) {
  const res = await fetch(`${tournamentBase(tournamentId)}/date/can-complete`)
  if (!res.ok) throw new Error(await parseError(res))
  const data = await res.json()
  return data.canComplete
}

export async function completeDate(tournamentId) {
  const res = await fetch(`${tournamentBase(tournamentId)}/date/complete`, { method: 'POST', headers: authHeaders() })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function startNextDate(tournamentId) {
  const res = await fetch(`${tournamentBase(tournamentId)}/date/next`, { method: 'POST', headers: authHeaders() })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}
