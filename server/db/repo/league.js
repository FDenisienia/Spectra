import { pool } from '../index.js'

function genId(prefix) {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9)
}

const DEFAULT_CONFIG = { points_win: 3, points_draw: 1, points_loss: 0, round_trip: false }

// --- Zones ---
export async function getZones(tournamentId) {
  const [rows] = await pool.query(
    'SELECT id, tournament_id, name, sort_order FROM league_zones WHERE tournament_id = ? ORDER BY sort_order, name',
    [tournamentId]
  )
  return rows.map((r) => ({
    id: r.id,
    tournament_id: r.tournament_id,
    name: r.name,
    sort_order: r.sort_order,
  }))
}

export async function createZone(tournamentId, { name, sort_order }) {
  const id = genId('zone')
  const order = sort_order ?? 0
  await pool.query(
    'INSERT INTO league_zones (id, tournament_id, name, sort_order) VALUES (?, ?, ?, ?)',
    [id, tournamentId, name || 'Zona', order]
  )
  const [rows] = await pool.query('SELECT id, tournament_id, name, sort_order FROM league_zones WHERE id = ?', [id])
  return rows[0]
}

export async function updateZone(zoneId, { name, sort_order }) {
  const updates = []
  const params = []
  if (name !== undefined) {
    updates.push('name = ?')
    params.push(name)
  }
  if (sort_order !== undefined) {
    updates.push('sort_order = ?')
    params.push(sort_order)
  }
  if (updates.length === 0) return getZoneById(zoneId)
  params.push(zoneId)
  await pool.query(`UPDATE league_zones SET ${updates.join(', ')} WHERE id = ?`, params)
  return getZoneById(zoneId)
}

async function getZoneById(zoneId) {
  const [rows] = await pool.query('SELECT id, tournament_id, name, sort_order FROM league_zones WHERE id = ?', [zoneId])
  return rows[0] || null
}

export async function deleteZone(zoneId) {
  await pool.query('UPDATE league_teams SET zone_id = NULL WHERE zone_id = ?', [zoneId])
  await pool.query('UPDATE league_matches SET zone_id = NULL WHERE zone_id = ?', [zoneId])
  const [r2] = await pool.query('DELETE FROM league_zones WHERE id = ?', [zoneId])
  return r2.affectedRows > 0
}

/** Elimina todas las zonas de un torneo (equipos y partidos quedan sin zona). */
export async function deleteAllZones(tournamentId) {
  const zones = await getZones(tournamentId)
  for (const z of zones) {
    await pool.query('UPDATE league_teams SET zone_id = NULL WHERE zone_id = ?', [z.id])
    await pool.query('UPDATE league_matches SET zone_id = NULL WHERE zone_id = ?', [z.id])
  }
  const [r] = await pool.query('DELETE FROM league_zones WHERE tournament_id = ?', [tournamentId])
  return r.affectedRows
}

/**
 * Sortea los equipos y crea zonas automáticamente.
 * @param {string} tournamentId
 * @param {number} numZones - Cantidad de zonas (grupos) a crear
 * @returns {{ zones, teams }} zonas creadas y equipos actualizados
 */
export async function drawAndCreateZones(tournamentId, numZones) {
  if (!numZones || numZones < 1) throw new Error('El número de zonas debe ser al menos 1')
  const teams = await getTeams(tournamentId)
  if (teams.length < 2) throw new Error('Se necesitan al menos 2 equipos para sortear')
  if (numZones > teams.length) throw new Error('No puede haber más zonas que equipos')

  const teamIds = teams.map((t) => t.id)
  for (let i = teamIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [teamIds[i], teamIds[j]] = [teamIds[j], teamIds[i]]
  }

  await deleteAllZones(tournamentId)

  const zoneNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
  const createdZones = []
  for (let i = 0; i < numZones; i++) {
    const zone = await createZone(tournamentId, { name: `Grupo ${zoneNames[i] || i + 1}`, sort_order: i })
    createdZones.push(zone)
  }

  const teamsPerZone = Math.ceil(teamIds.length / numZones)
  for (let i = 0; i < teamIds.length; i++) {
    const zoneIndex = Math.min(Math.floor(i / teamsPerZone), numZones - 1)
    const zoneId = createdZones[zoneIndex].id
    await pool.query('UPDATE league_teams SET zone_id = ? WHERE id = ?', [zoneId, teamIds[i]])
  }

  return { zones: createdZones, teams: await getTeams(tournamentId) }
}

// --- League config ---
const DEFAULT_PHASE = 'groups'

export async function getConfig(tournamentId) {
  const [rows] = await pool.query('SELECT * FROM league_config WHERE tournament_id = ?', [tournamentId])
  if (rows.length === 0) return { ...DEFAULT_CONFIG, phase: DEFAULT_PHASE, qualify_per_zone: null, fase_final_activa: false, odd_team_to: 'upper' }
  const r = rows[0]
  let qualify_per_zone = r.qualify_per_zone
  if (typeof qualify_per_zone === 'string') {
    try {
      qualify_per_zone = JSON.parse(qualify_per_zone)
    } catch {
      qualify_per_zone = null
    }
  }
  return {
    points_win: r.points_win ?? 3,
    points_draw: r.points_draw ?? 1,
    points_loss: r.points_loss ?? 0,
    round_trip: !!r.round_trip,
    phase: r.phase ?? DEFAULT_PHASE,
    qualify_per_zone: qualify_per_zone ?? null,
    fase_final_activa: !!r.fase_final_activa,
    odd_team_to: r.odd_team_to === 'lower' ? 'lower' : 'upper',
  }
}

export async function upsertConfig(tournamentId, { points_win, points_draw, points_loss, round_trip, phase, qualify_per_zone, fase_final_activa, odd_team_to }) {
  const qualifyJson = qualify_per_zone != null ? JSON.stringify(qualify_per_zone) : null
  const oddVal = odd_team_to === 'lower' ? 'lower' : 'upper'
  await pool.query(
    `INSERT INTO league_config (tournament_id, points_win, points_draw, points_loss, round_trip, phase, qualify_per_zone, fase_final_activa, odd_team_to)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       points_win = COALESCE(VALUES(points_win), points_win),
       points_draw = COALESCE(VALUES(points_draw), points_draw),
       points_loss = COALESCE(VALUES(points_loss), points_loss),
       round_trip = COALESCE(VALUES(round_trip), round_trip),
       phase = COALESCE(VALUES(phase), phase),
       qualify_per_zone = VALUES(qualify_per_zone),
       fase_final_activa = COALESCE(VALUES(fase_final_activa), fase_final_activa),
       odd_team_to = COALESCE(VALUES(odd_team_to), odd_team_to)`,
    [
      tournamentId,
      points_win ?? DEFAULT_CONFIG.points_win,
      points_draw ?? DEFAULT_CONFIG.points_draw,
      points_loss ?? DEFAULT_CONFIG.points_loss,
      round_trip ? 1 : 0,
      phase ?? DEFAULT_PHASE,
      qualifyJson,
      fase_final_activa ? 1 : 0,
      oddVal,
    ]
  )
  return getConfig(tournamentId)
}

// --- Teams ---
export async function getTeams(tournamentId, { zoneId = null } = {}) {
  let sql = 'SELECT t.id, t.tournament_id, t.zone_id, t.name, t.shield_url, z.name AS zone_name FROM league_teams t LEFT JOIN league_zones z ON t.zone_id = z.id WHERE t.tournament_id = ?'
  const params = [tournamentId]
  if (zoneId) {
    sql += ' AND t.zone_id = ?'
    params.push(zoneId)
  }
  sql += ' ORDER BY z.sort_order, z.name, t.name'
  const [rows] = await pool.query(sql, params)
  return rows.map((r) => ({
    id: r.id,
    tournament_id: r.tournament_id,
    zone_id: r.zone_id,
    zone_name: r.zone_name,
    name: r.name,
    shield_url: r.shield_url,
  }))
}

export async function createTeam(tournamentId, { name, shield_url, zone_id }) {
  const id = genId('team')
  await pool.query(
    'INSERT INTO league_teams (id, tournament_id, zone_id, name, shield_url) VALUES (?, ?, ?, ?, ?)',
    [id, tournamentId, zone_id || null, name || 'Equipo', shield_url || null]
  )
  const [rows] = await pool.query('SELECT id, tournament_id, zone_id, name, shield_url FROM league_teams WHERE id = ?', [id])
  return rows[0]
}

export async function updateTeam(teamId, { name, shield_url, zone_id }) {
  const updates = []
  const params = []
  if (name !== undefined) {
    updates.push('name = ?')
    params.push(name)
  }
  if (shield_url !== undefined) {
    updates.push('shield_url = ?')
    params.push(shield_url)
  }
  if (zone_id !== undefined) {
    updates.push('zone_id = ?')
    params.push(zone_id || null)
  }
  if (updates.length === 0) return getTeamById(teamId)
  params.push(teamId)
  await pool.query(`UPDATE league_teams SET ${updates.join(', ')} WHERE id = ?`, params)
  return getTeamById(teamId)
}

async function getTeamById(teamId) {
  const [rows] = await pool.query('SELECT id, tournament_id, zone_id, name, shield_url FROM league_teams WHERE id = ?', [teamId])
  return rows[0] || null
}

// --- Team players ---
const PLAYER_ROLES = ['captain', 'player', 'guest']

export async function getTeamPlayers(teamId) {
  const [rows] = await pool.query(
    `SELECT id, team_id, player_name, dni, shirt_number, role FROM league_team_players WHERE team_id = ?
     ORDER BY CASE role WHEN 'captain' THEN 0 WHEN 'player' THEN 1 WHEN 'guest' THEN 2 ELSE 1 END, shirt_number, player_name`,
    [teamId]
  )
  return rows.map((r) => ({
    id: r.id,
    team_id: r.team_id,
    player_name: r.player_name,
    dni: r.dni,
    shirt_number: r.shirt_number,
    role: PLAYER_ROLES.includes(r.role) ? r.role : 'player',
  }))
}

export async function createTeamPlayer(teamId, { player_name, dni, shirt_number, role }) {
  const id = genId('pl')
  const r = PLAYER_ROLES.includes(role) ? role : 'player'
  await pool.query(
    'INSERT INTO league_team_players (id, team_id, player_name, dni, shirt_number, role) VALUES (?, ?, ?, ?, ?, ?)',
    [id, teamId, player_name?.trim() || 'Jugador', dni?.trim() || null, shirt_number || null, r]
  )
  const [rows] = await pool.query('SELECT id, team_id, player_name, dni, shirt_number, role FROM league_team_players WHERE id = ?', [id])
  return rows[0]
}

export async function updateTeamPlayer(playerId, { player_name, dni, shirt_number, role }) {
  const updates = []
  const params = []
  if (player_name !== undefined) {
    updates.push('player_name = ?')
    params.push(player_name?.trim() || 'Jugador')
  }
  if (dni !== undefined) {
    updates.push('dni = ?')
    params.push(dni?.trim() || null)
  }
  if (shirt_number !== undefined) {
    updates.push('shirt_number = ?')
    params.push(shirt_number || null)
  }
  if (role !== undefined && PLAYER_ROLES.includes(role)) {
    updates.push('role = ?')
    params.push(role)
  }
  if (updates.length === 0) return null
  params.push(playerId)
  await pool.query(`UPDATE league_team_players SET ${updates.join(', ')} WHERE id = ?`, params)
  const [rows] = await pool.query('SELECT id, team_id, player_name, dni, shirt_number, role FROM league_team_players WHERE id = ?', [playerId])
  return rows[0] ? { ...rows[0], role: PLAYER_ROLES.includes(rows[0].role) ? rows[0].role : 'player' } : null
}

export async function deleteTeamPlayer(playerId) {
  const [r] = await pool.query('DELETE FROM league_team_players WHERE id = ?', [playerId])
  return r.affectedRows > 0
}

export async function getPlayersByTeamIds(teamIds) {
  if (!teamIds?.length) return {}
  const placeholders = teamIds.map(() => '?').join(',')
  const [rows] = await pool.query(
    `SELECT id, team_id, player_name, dni, shirt_number, role FROM league_team_players WHERE team_id IN (${placeholders}) ORDER BY shirt_number, player_name`,
    teamIds
  )
  const byTeam = {}
  for (const r of rows) {
    if (!byTeam[r.team_id]) byTeam[r.team_id] = []
    byTeam[r.team_id].push({
      id: r.id,
      team_id: r.team_id,
      player_name: r.player_name,
      dni: r.dni,
      shirt_number: r.shirt_number,
      role: PLAYER_ROLES.includes(r.role) ? r.role : 'player',
    })
  }
  return byTeam
}

export async function deleteTeam(teamId) {
  const conn = await pool.getConnection()
  try {
    await conn.query('START TRANSACTION')
    // Eliminar partidos donde el equipo participa (CASCADE borra goles y tarjetas)
    await conn.query('DELETE FROM league_matches WHERE home_team_id = ? OR away_team_id = ?', [teamId, teamId])
    // Jugadores se borran por CASCADE al eliminar el equipo
    const [r] = await conn.query('DELETE FROM league_teams WHERE id = ?', [teamId])
    await conn.query('COMMIT')
    return r.affectedRows > 0
  } catch (err) {
    await conn.query('ROLLBACK')
    throw err
  } finally {
    conn.release()
  }
}

// --- Matchdays ---
export async function getMatchdays(tournamentId) {
  const [rows] = await pool.query(
    'SELECT id, tournament_id, number FROM league_matchdays WHERE tournament_id = ? ORDER BY number',
    [tournamentId]
  )
  return rows
}

export async function createMatchday(tournamentId, number) {
  const id = genId('md')
  await pool.query('INSERT INTO league_matchdays (id, tournament_id, number) VALUES (?, ?, ?)', [id, tournamentId, number])
  const [rows] = await pool.query('SELECT id, tournament_id, number FROM league_matchdays WHERE id = ?', [id])
  return rows[0]
}

export async function deleteMatchday(matchdayId) {
  const [r] = await pool.query('DELETE FROM league_matchdays WHERE id = ?', [matchdayId])
  return r.affectedRows > 0
}

function roundRobinRounds(teamIds) {
  const n = teamIds.length
  const numRounds = n % 2 === 0 ? n - 1 : n
  const matchesPerRound = Math.floor(n / 2)
  const rounds = []
  const fixed = teamIds[0]
  let rotating = teamIds.slice(1)
  for (let r = 0; r < numRounds; r++) {
    const roundMatches = []
    roundMatches.push([fixed, rotating[rotating.length - 1]])
    for (let i = 0; i < matchesPerRound - 1; i++) {
      roundMatches.push([rotating[i], rotating[rotating.length - 2 - i]])
    }
    rounds.push(roundMatches)
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)]
  }
  return rounds
}

/**
 * Genera fixture round-robin: todos contra todos, por zona.
 * Liga simple: N-1 jornadas por zona. Ida y vuelta: 2*(N-1).
 * Las jornadas son compartidas: misma fecha reúne partidos de todas las zonas.
 */
export async function generateFixture(tournamentId, { round_trip = false } = {}) {
  const [teamsRows] = await pool.query(
    'SELECT id, zone_id FROM league_teams WHERE tournament_id = ? ORDER BY zone_id, name',
    [tournamentId]
  )
  if (teamsRows.length < 2) throw new Error('Se necesitan al menos 2 equipos para generar el fixture')

  const config = await getConfig(tournamentId)
  const useRoundTrip = round_trip ?? config.round_trip

  const byZone = new Map()
  for (const t of teamsRows) {
    const z = t.zone_id ?? '_single'
    if (!byZone.has(z)) byZone.set(z, [])
    byZone.get(z).push(t.id)
  }

  const zoneRounds = new Map()
  let maxRounds = 0
  for (const [zoneId, teamIds] of byZone) {
    if (teamIds.length < 2) continue
    const rounds = roundRobinRounds(teamIds)
    zoneRounds.set(zoneId, rounds)
    const zoneMatchdays = useRoundTrip ? rounds.length * 2 : rounds.length
    if (zoneMatchdays > maxRounds) maxRounds = zoneMatchdays
  }

  if (zoneRounds.size === 0) throw new Error('Cada zona debe tener al menos 2 equipos')

  const [existingMatchdays] = await pool.query(
    'SELECT number FROM league_matchdays WHERE tournament_id = ? ORDER BY number',
    [tournamentId]
  )
  const existingNumbers = new Set(existingMatchdays.map((r) => r.number))
  const created = { matchdays: [], matches: [] }

  for (let mdNum = 1; mdNum <= maxRounds; mdNum++) {
    if (existingNumbers.has(mdNum)) continue
    const md = await createMatchday(tournamentId, mdNum)
    created.matchdays.push(md)

    for (const [zoneId, rounds] of zoneRounds) {
      const numRounds = rounds.length
      const totalZoneRounds = useRoundTrip ? numRounds * 2 : numRounds
      const zoneRoundIdx = (mdNum - 1) % totalZoneRounds
      const isReturnLeg = useRoundTrip && zoneRoundIdx >= numRounds
      const roundIdx = isReturnLeg ? zoneRoundIdx - numRounds : zoneRoundIdx
      const round = rounds[roundIdx] || []
      const zId = zoneId === '_single' ? null : zoneId

      for (const [homeId, awayId] of round) {
        const [h, a] = isReturnLeg ? [awayId, homeId] : [homeId, awayId]
        const m = await createMatch(md.id, h, a, null, zId)
        created.matches.push(m)
      }
    }
  }

  const totalMatches = Array.from(zoneRounds.values()).reduce((sum, rounds) => {
    return sum + rounds.reduce((s, r) => s + r.length, 0) * (useRoundTrip ? 2 : 1)
  }, 0)

  return {
    totalMatchdays: maxRounds,
    totalMatches,
    created,
  }
}

// --- Matches ---
export async function getMatchesByMatchday(matchdayId, { zoneId = null } = {}) {
  let sql = `SELECT m.id, m.matchday_id, m.zone_id, m.home_team_id, m.away_team_id, m.home_score, m.away_score, m.home_games, m.away_games, m.played_at, m.status,
      ht.name AS home_team_name, ht.shield_url AS home_shield,
      at.name AS away_team_name, at.shield_url AS away_shield,
      z.name AS zone_name
     FROM league_matches m
     JOIN league_teams ht ON m.home_team_id = ht.id
     JOIN league_teams at ON m.away_team_id = at.id
     LEFT JOIN league_zones z ON m.zone_id = z.id
     WHERE m.matchday_id = ?`
  const params = [matchdayId]
  if (zoneId) {
    sql += ' AND COALESCE(m.zone_id, ht.zone_id) = ?'
    params.push(zoneId)
  }
  sql += ' ORDER BY z.sort_order, z.name, m.played_at, m.id'
  const [rows] = await pool.query(sql, params)
  return rows.map((r) => ({
    id: r.id,
    matchday_id: r.matchday_id,
    zone_id: r.zone_id,
    zone_name: r.zone_name,
    home_team_id: r.home_team_id,
    away_team_id: r.away_team_id,
    home_score: r.home_score,
    away_score: r.away_score,
    home_games: r.home_games,
    away_games: r.away_games,
    played_at: r.played_at,
    status: r.status,
    home_team_name: r.home_team_name,
    away_team_name: r.away_team_name,
    home_shield: r.home_shield,
    away_shield: r.away_shield,
  }))
}

export async function getMatchesByTournament(tournamentId) {
  const [rows] = await pool.query(
    `SELECT m.id, m.matchday_id, m.home_team_id, m.away_team_id, m.home_score, m.away_score, m.played_at, m.status,
      md.number AS matchday_number,
      ht.name AS home_team_name, at.name AS away_team_name
     FROM league_matches m
     JOIN league_matchdays md ON m.matchday_id = md.id
     JOIN league_teams ht ON m.home_team_id = ht.id
     JOIN league_teams at ON m.away_team_id = at.id
     WHERE md.tournament_id = ?
     ORDER BY md.number, m.played_at, m.id`,
    [tournamentId]
  )
  return rows
}

export async function createMatch(matchdayId, home_team_id, away_team_id, played_at = null, zone_id = null) {
  const [[homeRows], [awayRows]] = await Promise.all([
    pool.query('SELECT zone_id FROM league_teams WHERE id = ?', [home_team_id]),
    pool.query('SELECT zone_id FROM league_teams WHERE id = ?', [away_team_id]),
  ])
  const homeZone = homeRows?.[0]?.zone_id ?? null
  const awayZone = awayRows?.[0]?.zone_id ?? null
  if ((homeZone || awayZone) && homeZone !== awayZone) {
    throw new Error('Los dos equipos deben ser de la misma zona. Los partidos se juegan solo dentro de cada zona.')
  }
  const zone = zone_id ?? homeZone ?? awayZone
  const id = genId('m')
  await pool.query(
    'INSERT INTO league_matches (id, matchday_id, zone_id, home_team_id, away_team_id, played_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, matchdayId, zone, home_team_id, away_team_id, played_at, 'scheduled']
  )
  const [rows] = await pool.query(
    `SELECT m.id, m.matchday_id, m.zone_id, m.home_team_id, m.away_team_id, m.home_score, m.away_score, m.played_at, m.status,
      ht.name AS home_team_name, at.name AS away_team_name
     FROM league_matches m
     JOIN league_teams ht ON m.home_team_id = ht.id
     JOIN league_teams at ON m.away_team_id = at.id
     WHERE m.id = ?`,
    [id]
  )
  return rows[0] || null
}

export async function updateMatch(matchId, data) {
  const updates = []
  const params = []
  if (data.home_score !== undefined) {
    updates.push('home_score = ?')
    params.push(data.home_score)
  }
  if (data.away_score !== undefined) {
    updates.push('away_score = ?')
    params.push(data.away_score)
  }
  if (data.home_games !== undefined) {
    updates.push('home_games = ?')
    params.push(data.home_games)
  }
  if (data.away_games !== undefined) {
    updates.push('away_games = ?')
    params.push(data.away_games)
  }
  if (data.played_at !== undefined) {
    updates.push('played_at = ?')
    params.push(data.played_at)
  }
  if (data.status !== undefined) {
    updates.push('status = ?')
    params.push(data.status)
  }
  if (updates.length === 0) return null
  params.push(matchId)
  await pool.query(`UPDATE league_matches SET ${updates.join(', ')} WHERE id = ?`, params)
  const [rows] = await pool.query(
    `SELECT m.id, m.matchday_id, m.home_team_id, m.away_team_id, m.home_score, m.away_score, m.played_at, m.status
     FROM league_matches m WHERE m.id = ?`,
    [matchId]
  )
  return rows[0] || null
}

export async function deleteMatch(matchId) {
  const [r] = await pool.query('DELETE FROM league_matches WHERE id = ?', [matchId])
  return r.affectedRows > 0
}

// --- Goals (cantidad de goles por fila, no minuto) ---
export async function getGoalsByMatch(matchId) {
  const [rows] = await pool.query(
    'SELECT g.id, g.match_id, g.player_name, g.team_id, COALESCE(g.goals, 1) AS goals, t.name AS team_name FROM league_goals g JOIN league_teams t ON g.team_id = t.id WHERE g.match_id = ? ORDER BY g.id',
    [matchId]
  )
  return rows.map((r) => ({ ...r, goals: Number(r.goals) }))
}

export async function addGoal(matchId, { player_name, team_id, goals }) {
  const id = genId('g')
  const qty = Math.max(1, Number(goals) || 1)
  await pool.query(
    'INSERT INTO league_goals (id, match_id, player_name, team_id, goals) VALUES (?, ?, ?, ?, ?)',
    [id, matchId, player_name, team_id, qty]
  )
  const [rows] = await pool.query('SELECT id, match_id, player_name, team_id, COALESCE(goals, 1) AS goals FROM league_goals WHERE id = ?', [id])
  return { ...rows[0], goals: Number(rows[0].goals) }
}

export async function deleteGoal(goalId) {
  const [r] = await pool.query('DELETE FROM league_goals WHERE id = ?', [goalId])
  return r.affectedRows > 0
}

// --- Cards ---
export async function getCardsByMatch(matchId) {
  const [rows] = await pool.query(
    'SELECT c.id, c.match_id, c.player_name, c.team_id, c.card_type, t.name AS team_name FROM league_cards c JOIN league_teams t ON c.team_id = t.id WHERE c.match_id = ? ORDER BY c.id',
    [matchId]
  )
  return rows
}

function placeholders(arr) {
  return arr.map(() => '?').join(',')
}

export async function getGoalsByMatchIds(matchIds) {
  if (!matchIds?.length) return {}
  const [rows] = await pool.query(
    `SELECT g.id, g.match_id, g.player_name, g.team_id, COALESCE(g.goals, 1) AS goals, t.name AS team_name FROM league_goals g JOIN league_teams t ON g.team_id = t.id WHERE g.match_id IN (${placeholders(matchIds)}) ORDER BY g.match_id, g.id`,
    matchIds
  )
  const byMatch = {}
  for (const r of rows) {
    if (!byMatch[r.match_id]) byMatch[r.match_id] = []
    byMatch[r.match_id].push({ ...r, goals: Number(r.goals) })
  }
  return byMatch
}

export async function getCardsByMatchIds(matchIds) {
  if (!matchIds?.length) return {}
  const [rows] = await pool.query(
    `SELECT c.id, c.match_id, c.player_name, c.team_id, c.card_type, t.name AS team_name FROM league_cards c JOIN league_teams t ON c.team_id = t.id WHERE c.match_id IN (${placeholders(matchIds)}) ORDER BY c.match_id, c.id`,
    matchIds
  )
  const byMatch = {}
  for (const r of rows) {
    if (!byMatch[r.match_id]) byMatch[r.match_id] = []
    byMatch[r.match_id].push(r)
  }
  return byMatch
}

export async function addCard(matchId, { player_name, team_id, card_type }) {
  const id = genId('c')
  await pool.query(
    'INSERT INTO league_cards (id, match_id, player_name, team_id, card_type) VALUES (?, ?, ?, ?, ?)',
    [id, matchId, player_name, team_id, card_type]
  )
  const [rows] = await pool.query('SELECT id, match_id, player_name, team_id, card_type FROM league_cards WHERE id = ?', [id])
  return rows[0]
}

export async function deleteCard(cardId) {
  const [r] = await pool.query('DELETE FROM league_cards WHERE id = ?', [cardId])
  return r.affectedRows > 0
}

// --- Current matchday ---
export async function getCurrentMatchday(tournamentId) {
  const [rows] = await pool.query(
    `SELECT md.id, md.tournament_id, md.number
     FROM league_matchdays md
     LEFT JOIN league_matches m ON m.matchday_id = md.id AND m.status = 'played'
     WHERE md.tournament_id = ?
     GROUP BY md.id, md.number
     HAVING COUNT(m.id) < (SELECT COUNT(*) FROM league_matches m2 WHERE m2.matchday_id = md.id)
     ORDER BY md.number ASC
     LIMIT 1`,
    [tournamentId]
  )
  if (rows.length > 0) return rows[0]
  const [last] = await pool.query(
    'SELECT id, tournament_id, number FROM league_matchdays WHERE tournament_id = ? ORDER BY number DESC LIMIT 1',
    [tournamentId]
  )
  return last[0] || null
}

// --- Standings (computed) ---
export async function getStandings(tournamentId, { zoneId = null, sport = null } = {}) {
  const config = await getConfig(tournamentId)
  const ptsWin = config.points_win ?? 3
  const ptsDraw = config.points_draw ?? 1
  const isPadel = sport === 'padel'

  let teamsSql = 'SELECT id, zone_id, name, shield_url FROM league_teams WHERE tournament_id = ?'
  const teamsParams = [tournamentId]
  if (zoneId) {
    teamsSql += ' AND zone_id = ?'
    teamsParams.push(zoneId)
  }
  const [teams] = await pool.query(teamsSql, teamsParams)

  let matchesSql = `SELECT m.home_team_id, m.away_team_id, m.home_score, m.away_score, m.home_games, m.away_games, m.status, COALESCE(m.zone_id, ht.zone_id) AS zone_id
     FROM league_matches m
     JOIN league_matchdays md ON m.matchday_id = md.id
     JOIN league_teams ht ON m.home_team_id = ht.id
     WHERE md.tournament_id = ? AND m.status = 'played'`
  const matchesParams = [tournamentId]
  if (zoneId) {
    matchesSql += ' AND (m.zone_id = ? OR (m.zone_id IS NULL AND ht.zone_id = ?))'
    matchesParams.push(zoneId, zoneId)
  }
  const [matches] = await pool.query(matchesSql, matchesParams)
  const stats = {}
  for (const t of teams) {
    stats[t.id] = {
      team_id: t.id,
      team_name: t.name,
      shield_url: t.shield_url,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      ...(isPadel && { games_for: 0, games_against: 0 }),
    }
  }
  for (const m of matches) {
    const home = stats[m.home_team_id]
    const away = stats[m.away_team_id]
    if (!home || !away) continue
    const h = m.home_score ?? 0
    const a = m.away_score ?? 0
    home.played++
    away.played++
    home.goals_for += h
    home.goals_against += a
    away.goals_for += a
    away.goals_against += h
    if (isPadel) {
      const hg = m.home_games ?? 0
      const ag = m.away_games ?? 0
      home.games_for = (home.games_for ?? 0) + hg
      home.games_against = (home.games_against ?? 0) + ag
      away.games_for = (away.games_for ?? 0) + ag
      away.games_against = (away.games_against ?? 0) + hg
    }
    if (h > a) {
      home.won++
      away.lost++
    } else if (h < a) {
      away.won++
      home.lost++
    } else {
      home.drawn++
      away.drawn++
    }
  }
  const list = Object.values(stats).map((s) => ({
    ...s,
    goal_diff: s.goals_for - s.goals_against,
    ...(isPadel && {
      games_diff: (s.games_for ?? 0) - (s.games_against ?? 0),
    }),
    points: s.won * ptsWin + s.drawn * ptsDraw,
  }))

  // Orden: 1) Puntos, 2) DG (sets o goles), 3) Games diff (padel), 4) GF, 5) Resultado entre sí
  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const dgA = a.goal_diff ?? 0
    const dgB = b.goal_diff ?? 0
    if (dgB !== dgA) return dgB - dgA
    if (isPadel) {
      const gdA = a.games_diff ?? 0
      const gdB = b.games_diff ?? 0
      if (gdB !== gdA) return gdB - gdA
    }
    const gfA = a.goals_for ?? 0
    const gfB = b.goals_for ?? 0
    if (gfB !== gfA) return gfB - gfA
    const h2h = headToHead(a.team_id, b.team_id, matches, ptsWin, ptsDraw)
    if (h2h !== 0) return h2h
    return 0
  })
  return list.map((s, i) => ({ ...s, position: i + 1 }))
}

function headToHead(teamA, teamB, matches, ptsWin, ptsDraw) {
  let ptsA = 0
  let ptsB = 0
  for (const m of matches) {
    if ((m.home_team_id !== teamA && m.home_team_id !== teamB) || (m.away_team_id !== teamA && m.away_team_id !== teamB)) continue
    const h = m.home_score ?? 0
    const a = m.away_score ?? 0
    if (m.home_team_id === teamA) {
      if (h > a) ptsA += ptsWin
      else if (h < a) ptsB += ptsWin
      else { ptsA += ptsDraw; ptsB += ptsDraw }
    } else {
      if (a > h) ptsA += ptsWin
      else if (a < h) ptsB += ptsWin
      else { ptsA += ptsDraw; ptsB += ptsDraw }
    }
  }
  return ptsB - ptsA
}

// --- Top scorers ---
export async function getScorers(tournamentId, { zoneId = null } = {}) {
  let sql = `SELECT g.player_name, g.team_id, t.name AS team_name, SUM(COALESCE(g.goals, 1)) AS goals
     FROM league_goals g
     JOIN league_matches m ON g.match_id = m.id
     JOIN league_matchdays md ON m.matchday_id = md.id
     JOIN league_teams t ON g.team_id = t.id
     WHERE md.tournament_id = ?`
  const params = [tournamentId]
  if (zoneId) {
    sql += ' AND (m.zone_id = ? OR (m.zone_id IS NULL AND t.zone_id = ?))'
    params.push(zoneId, zoneId)
  }
  sql += ' GROUP BY g.player_name, g.team_id, t.name ORDER BY goals DESC, g.player_name'
  const [rows] = await pool.query(sql, params)
  return rows.map((r, i) => ({ position: i + 1, player_name: r.player_name, team_name: r.team_name, team_id: r.team_id, goals: Number(r.goals) }))
}

/** Goleadores incluyendo fase de grupos + playoffs */
export async function getScorersGlobal(tournamentId, { zoneId = null } = {}) {
  const fromGroup = await getScorers(tournamentId, { zoneId })
  const [playoffRows] = await pool.query(
    `SELECT g.player_name, g.team_id, t.name AS team_name, SUM(COALESCE(g.goals, 1)) AS goals
     FROM league_playoff_goals g
     JOIN league_playoff_matches pm ON g.playoff_match_id = pm.id
     JOIN league_playoff_rounds pr ON pm.round_id = pr.id
     JOIN league_teams t ON g.team_id = t.id
     WHERE pr.tournament_id = ?
     GROUP BY g.player_name, g.team_id, t.name`,
    [tournamentId]
  )
  const combined = {}
  for (const r of fromGroup) {
    const key = `${r.player_name}-${r.team_id}`
    combined[key] = { ...r, goals: Number(r.goals) }
  }
  for (const r of playoffRows) {
    const key = `${r.player_name}-${r.team_id}`
    if (!combined[key]) combined[key] = { player_name: r.player_name, team_id: r.team_id, team_name: r.team_name, goals: 0 }
    combined[key].goals += Number(r.goals)
  }
  const list = Object.values(combined).sort((a, b) => b.goals - a.goals || (a.player_name || '').localeCompare(b.player_name || ''))
  return list.map((r, i) => ({ position: i + 1, player_name: r.player_name, team_name: r.team_name, team_id: r.team_id, goals: r.goals }))
}

// --- Discipline (cards by player) ---
export async function getDiscipline(tournamentId, { zoneId = null } = {}) {
  let sql = `SELECT c.player_name, c.team_id, t.name AS team_name,
       SUM(CASE WHEN c.card_type = 'yellow' THEN 1 ELSE 0 END) AS yellow,
       SUM(CASE WHEN c.card_type = 'red' THEN 1 ELSE 0 END) AS red
     FROM league_cards c
     JOIN league_matches m ON c.match_id = m.id
     JOIN league_matchdays md ON m.matchday_id = md.id
     JOIN league_teams t ON c.team_id = t.id
     WHERE md.tournament_id = ?`
  const params = [tournamentId]
  if (zoneId) {
    sql += ' AND (m.zone_id = ? OR (m.zone_id IS NULL AND t.zone_id = ?))'
    params.push(zoneId, zoneId)
  }
  sql += ` GROUP BY c.player_name, c.team_id, t.name
     HAVING yellow > 0 OR red > 0
     ORDER BY red DESC, yellow DESC`
  const [rows] = await pool.query(sql, params)
  return rows.map((r) => ({
    player_name: r.player_name,
    team_id: r.team_id,
    team_name: r.team_name,
    yellow: Number(r.yellow),
    red: Number(r.red),
  }))
}

/** Tarjetas incluyendo fase de grupos + playoffs */
export async function getDisciplineGlobal(tournamentId, { zoneId = null } = {}) {
  const fromGroup = await getDiscipline(tournamentId, { zoneId })
  const [playoffRows] = await pool.query(
    `SELECT c.player_name, c.team_id, t.name AS team_name,
       SUM(CASE WHEN c.card_type = 'yellow' THEN 1 ELSE 0 END) AS yellow,
       SUM(CASE WHEN c.card_type = 'red' THEN 1 ELSE 0 END) AS red
     FROM league_playoff_cards c
     JOIN league_playoff_matches pm ON c.playoff_match_id = pm.id
     JOIN league_playoff_rounds pr ON pm.round_id = pr.id
     JOIN league_teams t ON c.team_id = t.id
     WHERE pr.tournament_id = ?
     GROUP BY c.player_name, c.team_id, t.name
     HAVING yellow > 0 OR red > 0`,
    [tournamentId]
  )
  const combined = {}
  for (const r of fromGroup) {
    const key = `${r.player_name}-${r.team_id}`
    combined[key] = { ...r, yellow: r.yellow, red: r.red }
  }
  for (const r of playoffRows) {
    const key = `${r.player_name}-${r.team_id}`
    if (!combined[key]) combined[key] = { player_name: r.player_name, team_id: r.team_id, team_name: r.team_name, yellow: 0, red: 0 }
    combined[key].yellow += Number(r.yellow)
    combined[key].red += Number(r.red)
  }
  return Object.values(combined).sort((a, b) => b.red - a.red || b.yellow - a.yellow)
}

// --- Scorers by team (internal ranking) ---
export async function getScorersByTeam(tournamentId, teamId) {
  const [rows] = await pool.query(
    `SELECT g.player_name, g.team_id, t.name AS team_name, SUM(COALESCE(g.goals, 1)) AS goals
     FROM league_goals g
     JOIN league_matches m ON g.match_id = m.id
     JOIN league_matchdays md ON m.matchday_id = md.id
     JOIN league_teams t ON g.team_id = t.id
     WHERE md.tournament_id = ? AND g.team_id = ?
     GROUP BY g.player_name, g.team_id, t.name ORDER BY goals DESC, g.player_name`,
    [tournamentId, teamId]
  )
  return rows.map((r, i) => ({
    position: i + 1,
    player_name: r.player_name,
    team_id: r.team_id,
    team_name: r.team_name,
    goals: Number(r.goals),
  }))
}

// --- Discipline by team (internal ranking) ---
export async function getDisciplineByTeam(tournamentId, teamId) {
  const [rows] = await pool.query(
    `SELECT c.player_name, c.team_id, t.name AS team_name,
       SUM(CASE WHEN c.card_type = 'yellow' THEN 1 ELSE 0 END) AS yellow,
       SUM(CASE WHEN c.card_type = 'red' THEN 1 ELSE 0 END) AS red
     FROM league_cards c
     JOIN league_matches m ON c.match_id = m.id
     JOIN league_matchdays md ON m.matchday_id = md.id
     JOIN league_teams t ON c.team_id = t.id
     WHERE md.tournament_id = ? AND c.team_id = ?
     GROUP BY c.player_name, c.team_id, t.name
     HAVING yellow > 0 OR red > 0
     ORDER BY red DESC, yellow DESC`,
    [tournamentId, teamId]
  )
  return rows.map((r) => ({
    player_name: r.player_name,
    team_id: r.team_id,
    team_name: r.team_name,
    yellow: Number(r.yellow),
    red: Number(r.red),
  }))
}

// --- Next, previous and current match for a team ---
export async function getTeamMatchesSummary(tournamentId, teamId) {
  const [allRows] = await pool.query(
    `SELECT m.id, m.matchday_id, m.home_team_id, m.away_team_id, m.home_score, m.away_score, m.played_at, m.status,
      md.number AS matchday_number,
      ht.name AS home_team_name, at.name AS away_team_name
     FROM league_matches m
     JOIN league_matchdays md ON m.matchday_id = md.id
     JOIN league_teams ht ON m.home_team_id = ht.id
     JOIN league_teams at ON m.away_team_id = at.id
     WHERE md.tournament_id = ? AND (m.home_team_id = ? OR m.away_team_id = ?)
     ORDER BY md.number ASC, m.played_at ASC, m.id`,
    [tournamentId, teamId, teamId]
  )
  const currentMd = await getCurrentMatchday(tournamentId)
  const currentMatchdayId = currentMd?.id ?? null

  const mapRow = (r) => {
    const isHome = r.home_team_id === teamId
    return {
      id: r.id,
      matchday_id: r.matchday_id,
      matchday_number: r.matchday_number,
      home_team_id: r.home_team_id,
      away_team_id: r.away_team_id,
      home_team_name: r.home_team_name,
      away_team_name: r.away_team_name,
      home_score: r.home_score,
      away_score: r.away_score,
      played_at: r.played_at,
      status: r.status,
      rival_name: isHome ? r.away_team_name : r.home_team_name,
      is_home: isHome,
    }
  }

  const played = []
  const scheduled = []
  let currentMatch = null
  for (const r of allRows) {
    const row = mapRow(r)
    if (r.status === 'played') {
      played.push(row)
    } else {
      scheduled.push(row)
      if (currentMatchdayId && r.matchday_id === currentMatchdayId && !currentMatch) {
        currentMatch = row
      }
    }
  }

  const nextMatch = scheduled.length > 0 ? scheduled[0] : null
  const nextAfterCurrent = scheduled.length > 1 ? scheduled[1] : null
  return {
    nextMatch,
    nextAfterCurrent,
    previousMatch: played.length > 0 ? played[played.length - 1] : null,
    previousMatches: played,
    currentMatch: currentMatch || (scheduled.length > 0 && currentMatchdayId && scheduled[0].matchday_id === currentMatchdayId ? scheduled[0] : nextMatch),
  }
}

// --- Playoff rounds ---
export async function getPlayoffRounds(tournamentId) {
  const [rows] = await pool.query(
    'SELECT id, tournament_id, name, sort_order, phase_final_group FROM league_playoff_rounds WHERE tournament_id = ? ORDER BY phase_final_group, sort_order, id',
    [tournamentId]
  )
  return rows.map((r) => ({ ...r, phase_final_group: r.phase_final_group || null }))
}

export async function createPlayoffRound(tournamentId, { name, sort_order, phase_final_group }) {
  const id = genId('pr')
  const order = sort_order ?? 0
  const groupVal = phase_final_group === 'upper' || phase_final_group === 'lower' ? phase_final_group : null
  await pool.query(
    'INSERT INTO league_playoff_rounds (id, tournament_id, name, sort_order, phase_final_group) VALUES (?, ?, ?, ?, ?)',
    [id, tournamentId, name || 'Ronda', order, groupVal]
  )
  const [rows] = await pool.query('SELECT id, tournament_id, name, sort_order, phase_final_group FROM league_playoff_rounds WHERE id = ?', [id])
  return { ...rows[0], phase_final_group: rows[0]?.phase_final_group || null }
}

// --- Playoff matches ---
export async function getPlayoffMatches(tournamentId, { roundId = null } = {}) {
  let sql = `SELECT pm.id, pm.round_id, pm.home_team_id, pm.away_team_id, pm.home_slot, pm.away_slot,
    pm.home_score, pm.away_score, pm.winner_advances_to_match_id, pm.winner_advances_as, pm.played_at, pm.status,
    pr.name AS round_name, pr.sort_order AS round_sort_order, pr.phase_final_group,
    ht.name AS home_team_name, at.name AS away_team_name
   FROM league_playoff_matches pm
   JOIN league_playoff_rounds pr ON pm.round_id = pr.id
   LEFT JOIN league_teams ht ON pm.home_team_id = ht.id
   LEFT JOIN league_teams at ON pm.away_team_id = at.id
   WHERE pr.tournament_id = ?`
  const params = [tournamentId]
  if (roundId) {
    sql += ' AND pm.round_id = ?'
    params.push(roundId)
  }
  sql += ' ORDER BY pr.sort_order, pm.id'
  const [rows] = await pool.query(sql, params)
  return rows.map((r) => ({
    id: r.id,
    round_id: r.round_id,
    round_name: r.round_name,
    round_sort_order: r.round_sort_order,
    phase_final_group: r.phase_final_group || null,
    home_team_id: r.home_team_id,
    away_team_id: r.away_team_id,
    home_team_name: r.home_team_name,
    away_team_name: r.away_team_name,
    home_slot: r.home_slot,
    away_slot: r.away_slot,
    home_score: r.home_score,
    away_score: r.away_score,
    winner_advances_to_match_id: r.winner_advances_to_match_id,
    winner_advances_as: r.winner_advances_as,
    played_at: r.played_at,
    status: r.status,
  }))
}

export async function getPlayoffBracket(tournamentId) {
  const rounds = await getPlayoffRounds(tournamentId)
  const matches = await getPlayoffMatches(tournamentId)
  const byRound = {}
  for (const r of rounds) {
    byRound[r.id] = { ...r, phase_final_group: r.phase_final_group || null, matches: [] }
  }
  for (const m of matches) {
    if (byRound[m.round_id]) byRound[m.round_id].matches.push({ ...m, phase_final_group: m.phase_final_group || byRound[m.round_id]?.phase_final_group || null })
  }
  return Object.values(byRound).sort((a, b) => {
    if (a.phase_final_group !== b.phase_final_group) {
      const order = { upper: 0, lower: 1 }
      return (order[a.phase_final_group] ?? 2) - (order[b.phase_final_group] ?? 2)
    }
    return a.sort_order - b.sort_order
  })
}

export async function createPlayoffMatch(roundId, { home_team_id, away_team_id, home_slot, away_slot, winner_advances_to_match_id, winner_advances_as }) {
  const id = genId('pm')
  await pool.query(
    `INSERT INTO league_playoff_matches (id, round_id, home_team_id, away_team_id, home_slot, away_slot, winner_advances_to_match_id, winner_advances_as, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
    [
      id,
      roundId,
      home_team_id || null,
      away_team_id || null,
      home_slot || null,
      away_slot || null,
      winner_advances_to_match_id || null,
      winner_advances_as || null,
    ]
  )
  const [rows] = await pool.query(
    `SELECT pm.id, pm.round_id, pm.home_team_id, pm.away_team_id, pm.home_slot, pm.away_slot, pm.home_score, pm.away_score,
      pm.winner_advances_to_match_id, pm.winner_advances_as, pm.played_at, pm.status,
      ht.name AS home_team_name, at.name AS away_team_name
     FROM league_playoff_matches pm
     LEFT JOIN league_teams ht ON pm.home_team_id = ht.id
     LEFT JOIN league_teams at ON pm.away_team_id = at.id
     WHERE pm.id = ?`,
    [id]
  )
  return rows[0] || null
}

export async function updatePlayoffMatch(matchId, { home_score, away_score, status, played_at }) {
  const updates = []
  const params = []
  if (home_score !== undefined) {
    updates.push('home_score = ?')
    params.push(home_score)
  }
  if (away_score !== undefined) {
    updates.push('away_score = ?')
    params.push(away_score)
  }
  if (status !== undefined) {
    updates.push('status = ?')
    params.push(status)
  }
  if (played_at !== undefined) {
    updates.push('played_at = ?')
    params.push(played_at)
  }
  if (updates.length === 0) return null
  params.push(matchId)
  await pool.query(`UPDATE league_playoff_matches SET ${updates.join(', ')} WHERE id = ?`, params)
  const [rows] = await pool.query('SELECT id, home_team_id, away_team_id, home_score, away_score, winner_advances_to_match_id, winner_advances_as FROM league_playoff_matches WHERE id = ?', [matchId])
  return rows[0] || null
}

export async function setPlayoffWinner(matchId, winnerTeamId) {
  const [rows] = await pool.query(
    'SELECT winner_advances_to_match_id, winner_advances_as FROM league_playoff_matches WHERE id = ?',
    [matchId]
  )
  const m = rows[0]
  if (!m || !m.winner_advances_to_match_id) return
  const col = m.winner_advances_as === 'home' ? 'home_team_id' : 'away_team_id'
  await pool.query(`UPDATE league_playoff_matches SET ${col} = ? WHERE id = ?`, [winnerTeamId, m.winner_advances_to_match_id])
}

/**
 * Genera la fase final en formato mini-ligas (Grupo A = mitad superior, Grupo B = mitad inferior).
 * Solo si fase_final_activa es true. Usa la tabla final de la fase regular.
 * odd_team_to: 'upper' | 'lower' indica a qué grupo va el equipo del medio cuando hay cantidad impar.
 */
export async function generatePhaseFinalMiniLeagues(tournamentId) {
  const config = await getConfig(tournamentId)
  if (!config.fase_final_activa) throw new Error('La fase final no está activa. Activá fase_final_activa en la configuración.')
  if (config.phase === 'final_mini_ligas') throw new Error('La fase final ya fue generada.')

  const standings = await getStandings(tournamentId, { zoneId: null })
  if (standings.length < 2) throw new Error('Se necesitan al menos 2 equipos en la tabla para generar la fase final.')

  const n = standings.length
  const oddToUpper = config.odd_team_to !== 'lower'
  const midIdx = Math.floor(n / 2)

  let upperTeamIds = standings.slice(0, midIdx + (n % 2 === 1 && oddToUpper ? 1 : 0)).map((s) => s.team_id)
  let lowerTeamIds = standings.slice(midIdx + (n % 2 === 1 && oddToUpper ? 1 : 0)).map((s) => s.team_id)

  if (n % 2 === 1 && !oddToUpper) {
    upperTeamIds = standings.slice(0, midIdx).map((s) => s.team_id)
    lowerTeamIds = standings.slice(midIdx).map((s) => s.team_id)
  }

  if (upperTeamIds.length < 2 || lowerTeamIds.length < 2) {
    throw new Error('Cada grupo debe tener al menos 2 equipos. Ajustá odd_team_to si hay cantidad impar.')
  }

  await pool.query('DELETE FROM league_playoff_rounds WHERE tournament_id = ?', [tournamentId])

  const createRoundsAndMatches = async (teamIds, groupType, groupLabel) => {
    const rounds = roundRobinRounds(teamIds)
    const createdRounds = []
    const createdMatches = []
    for (let i = 0; i < rounds.length; i++) {
      const round = await createPlayoffRound(tournamentId, {
        name: `${groupLabel} — Jornada ${i + 1}`,
        sort_order: i,
        phase_final_group: groupType,
      })
      createdRounds.push(round)
      for (const [homeId, awayId] of rounds[i]) {
        const m = await createPlayoffMatch(round.id, { home_team_id: homeId, away_team_id: awayId })
        createdMatches.push(m)
      }
    }
    return { createdRounds, createdMatches }
  }

  await createRoundsAndMatches(upperTeamIds, 'upper', 'Grupo A')
  await createRoundsAndMatches(lowerTeamIds, 'lower', 'Grupo B')

  await upsertConfig(tournamentId, { ...config, phase: 'final_mini_ligas' })
  return getPlayoffBracket(tournamentId)
}

/**
 * Standings de la fase final mini-ligas, calculados solo con partidos de playoff del grupo indicado.
 */
export async function getPhaseFinalStandings(tournamentId, { phase_final_group, sport = null } = {}) {
  if (!phase_final_group || (phase_final_group !== 'upper' && phase_final_group !== 'lower')) {
    return []
  }
  const config = await getConfig(tournamentId)
  if (config.phase !== 'final_mini_ligas') return []

  const [roundsRows] = await pool.query(
    'SELECT id FROM league_playoff_rounds WHERE tournament_id = ? AND phase_final_group = ?',
    [tournamentId, phase_final_group]
  )
  const roundIds = roundsRows.map((r) => r.id)
  if (roundIds.length === 0) return []

  const placeholders = roundIds.map(() => '?').join(',')
  const [matches] = await pool.query(
    `SELECT m.home_team_id, m.away_team_id, m.home_score, m.away_score, m.home_games, m.away_games, m.status
     FROM league_playoff_matches m WHERE m.round_id IN (${placeholders}) AND m.status = 'played'`,
    roundIds
  )

  const [teamsRows] = await pool.query(
    `SELECT DISTINCT t.id, t.name, t.shield_url FROM league_teams t
     JOIN league_playoff_matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id)
     WHERE m.round_id IN (${placeholders})`,
    roundIds
  )

  const isPadel = sport === 'padel'
  const ptsWin = config.points_win ?? 3
  const ptsDraw = config.points_draw ?? 1
  const stats = {}
  for (const t of teamsRows) {
    stats[t.id] = {
      team_id: t.id,
      team_name: t.name,
      shield_url: t.shield_url,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      ...(isPadel && { games_for: 0, games_against: 0 }),
    }
  }
  for (const m of matches) {
    const home = stats[m.home_team_id]
    const away = stats[m.away_team_id]
    if (!home || !away) continue
    const h = m.home_score ?? 0
    const a = m.away_score ?? 0
    home.played++
    away.played++
    home.goals_for += h
    home.goals_against += a
    away.goals_for += a
    away.goals_against += h
    if (isPadel) {
      const hg = m.home_games ?? 0
      const ag = m.away_games ?? 0
      home.games_for = (home.games_for ?? 0) + hg
      home.games_against = (home.games_against ?? 0) + ag
      away.games_for = (away.games_for ?? 0) + ag
      away.games_against = (away.games_against ?? 0) + hg
    }
    if (h > a) {
      home.won++
      away.lost++
    } else if (h < a) {
      away.won++
      home.lost++
    } else {
      home.drawn++
      away.drawn++
    }
  }
  const list = Object.values(stats).map((s) => ({
    ...s,
    goal_diff: s.goals_for - s.goals_against,
    ...(isPadel && { games_diff: (s.games_for ?? 0) - (s.games_against ?? 0) }),
    points: s.won * ptsWin + s.drawn * ptsDraw,
  }))
  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const dgA = a.goal_diff ?? 0
    const dgB = b.goal_diff ?? 0
    if (dgB !== dgA) return dgB - dgA
    if (isPadel) {
      const gdA = a.games_diff ?? 0
      const gdB = b.games_diff ?? 0
      if (gdB !== gdA) return gdB - gdA
    }
    return (b.goals_for ?? 0) - (a.goals_for ?? 0)
  })
  return list.map((s, i) => ({ ...s, position: i + 1 }))
}

/** Genera el cuadro de playoffs a partir de tablas de grupos. qualify_per_zone = { zoneId: number } (cuántos clasifican por zona). */
export async function generatePlayoffBracket(tournamentId) {
  await pool.query('DELETE FROM league_playoff_rounds WHERE tournament_id = ?', [tournamentId])
  const config = await getConfig(tournamentId)
  const qualify = config.qualify_per_zone || {}
  if (Object.keys(qualify).length === 0) throw new Error('Configurá cuántos equipos clasifican por grupo (qualify_per_zone)')
  const zones = await getZones(tournamentId)
  const slots = []
  for (const z of zones) {
    const n = qualify[z.id] ?? 0
    if (n <= 0) continue
    const st = await getStandings(tournamentId, { zoneId: z.id })
    for (let i = 0; i < n && i < st.length; i++) {
      slots.push({ zoneName: z.name, position: i + 1, team_id: st[i].team_id, team_name: st[i].team_name, points: st[i].points ?? 0, slot: `${z.name}${i + 1}` })
    }
  }
  if (slots.length < 2) throw new Error('Se necesitan al menos 2 equipos clasificados')
  slots.sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
  for (let i = 0; i < slots.length; i++) {
    slots[i].rank = i + 1
  }
  const numTeams = slots.length
  const numFirstRound = Math.pow(2, Math.ceil(Math.log2(numTeams)))
  const roundNamesBySize = {
    4: ['Semifinal', 'Final'],
    8: ['Semifinal', 'Final'],
    16: ['Octavos', 'Cuartos', 'Semifinal', 'Final'],
  }
  const numRoundsNeeded = Math.max(1, Math.ceil(Math.log2(numFirstRound)))
  let roundNames = roundNamesBySize[numFirstRound] || ['Semifinal', 'Final']
  while (roundNames.length < numRoundsNeeded) {
    roundNames = [...roundNames.slice(0, -1), 'Semifinal', 'Final']
  }
  roundNames = roundNames.slice(0, numRoundsNeeded)
  let roundOrder = 0
  const createdRounds = []
  const createdMatches = []
  for (let r = 0; r < roundNames.length; r++) {
    const count = Math.floor(numFirstRound / Math.pow(2, r + 1))
    if (count < 1) break
    const round = await createPlayoffRound(tournamentId, { name: roundNames[r], sort_order: roundOrder++ })
    createdRounds.push(round)
    for (let i = 0; i < count; i++) {
      createdMatches.push(await createPlayoffMatch(round.id, {}))
    }
  }
  for (let i = 0; i < createdRounds.length - 1; i++) {
    const round = createdRounds[i]
    const nextRound = createdRounds[i + 1]
    const roundMatches = createdMatches.filter((m) => m.round_id === round.id)
    const nextMatches = createdMatches.filter((m) => m.round_id === nextRound.id)
    for (let j = 0; j < roundMatches.length; j++) {
      const m = roundMatches[j]
      const nextIdx = Math.floor(j / 2)
      if (nextMatches[nextIdx]) {
        await pool.query(
          'UPDATE league_playoff_matches SET winner_advances_to_match_id = ?, winner_advances_as = ? WHERE id = ?',
          [nextMatches[nextIdx].id, j % 2 === 0 ? 'home' : 'away', m.id]
        )
      }
    }
  }
  const firstRound = createdRounds[0]
  const firstMatches = createdMatches.filter((m) => m.round_id === firstRound.id)
  const pairing = []
  if (numTeams === 4) {
    pairing.push([slots[0], slots[3]], [slots[1], slots[2]])
  } else if (numTeams === 8) {
    pairing.push([slots[0], slots[7]], [slots[3], slots[4]], [slots[1], slots[6]], [slots[2], slots[5]])
  } else {
    for (let i = 0; i < slots.length; i += 2) {
      if (slots[i + 1]) pairing.push([slots[i], slots[i + 1]])
    }
  }
  for (let i = 0; i < Math.min(pairing.length, firstMatches.length); i++) {
    const [slotA, slotB] = pairing[i]
    const match = firstMatches[i]
    if (match && slotA && slotB) {
      await pool.query(
        'UPDATE league_playoff_matches SET home_team_id = ?, away_team_id = ?, home_slot = ?, away_slot = ? WHERE id = ?',
        [slotA.team_id, slotB.team_id, slotA.slot, slotB.slot, match.id]
      )
    }
  }
  await upsertConfig(tournamentId, { ...config, phase: 'playoffs' })
  return getPlayoffBracket(tournamentId)
}

// --- Playoff goals & cards (para estadísticas globales) ---
export async function getPlayoffGoalsByMatch(playoffMatchId) {
  const [rows] = await pool.query(
    'SELECT g.id, g.playoff_match_id, g.player_name, g.team_id, COALESCE(g.goals, 1) AS goals, t.name AS team_name FROM league_playoff_goals g JOIN league_teams t ON g.team_id = t.id WHERE g.playoff_match_id = ? ORDER BY g.id',
    [playoffMatchId]
  )
  return rows.map((r) => ({ ...r, goals: Number(r.goals) }))
}

export async function addPlayoffGoal(playoffMatchId, { player_name, team_id, goals }) {
  const id = genId('pg')
  const qty = Math.max(1, Number(goals) || 1)
  await pool.query(
    'INSERT INTO league_playoff_goals (id, playoff_match_id, player_name, team_id, goals) VALUES (?, ?, ?, ?, ?)',
    [id, playoffMatchId, player_name, team_id, qty]
  )
  const [rows] = await pool.query('SELECT id, playoff_match_id, player_name, team_id, COALESCE(goals, 1) AS goals FROM league_playoff_goals WHERE id = ?', [id])
  return { ...rows[0], goals: Number(rows[0].goals) }
}

export async function getPlayoffCardsByMatch(playoffMatchId) {
  const [rows] = await pool.query(
    'SELECT c.id, c.playoff_match_id, c.player_name, c.team_id, c.card_type, t.name AS team_name FROM league_playoff_cards c JOIN league_teams t ON c.team_id = t.id WHERE c.playoff_match_id = ? ORDER BY c.id',
    [playoffMatchId]
  )
  return rows
}

export async function addPlayoffCard(playoffMatchId, { player_name, team_id, card_type }) {
  const id = genId('pc')
  await pool.query(
    'INSERT INTO league_playoff_cards (id, playoff_match_id, player_name, team_id, card_type) VALUES (?, ?, ?, ?, ?)',
    [id, playoffMatchId, player_name, team_id, card_type]
  )
  const [rows] = await pool.query('SELECT id, playoff_match_id, player_name, team_id, card_type FROM league_playoff_cards WHERE id = ?', [id])
  return rows[0]
}
