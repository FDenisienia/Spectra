import './loadEnv.js'
import express from 'express'
import cors from 'cors'
import {
  initState,
  reset,
  setConfig,
  addPlayers,
  generateDateMatches,
  getCurrentDateData,
  setSetScore,
  setMatchScores,
  completeMatch,
  completeDate,
  allMatchesInDateComplete,
  startNextDate,
  getState,
  getRanking,
  defaultState,
} from './tournament.js'
import { ensureSchema, pool } from './db/index.js'
import { seedAdmin } from './db/seedAdmin.js'
import * as tournamentsRepo from './db/repo/tournaments.js'
import * as leagueRepo from './db/repo/league.js'
import { login, requireAuth, changePassword } from './auth.js'

const app = express()
const PORT = process.env.PORT || 3000

// CORS: headers manuales + cors() para garantizar compatibilidad
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }))
app.use(express.json())

/** Torneo usa sistema de liga (grupos, equipos/parejas, jornadas): futbol, hockey, o padel con modalidad grupo/liga */
function isLeagueTournament(t) {
  if (!t) return false
  if (t.sport === 'futbol' || t.sport === 'hockey') return true
  if (t.sport === 'padel' && (t.modality === 'grupo' || t.modality === 'liga')) return true
  return false
}

async function withTournament(id, fn) {
  const t = await tournamentsRepo.getById(id)
  if (!t) throw new Error('Torneo no encontrado')
  if (t.sport !== 'padel') throw new Error('Este torneo no es de pádel')
  initState(t.state || defaultState())
  try {
    const result = fn()
    const newState = getState()
    await tournamentsRepo.updateState(id, newState)
    return result
  } catch (e) {
    throw e
  }
}

// --- Health ---
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Spectra API funcionando',
    timestamp: new Date().toISOString(),
  })
})

// --- Auth (público: login; protegido: me) ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' })
    const data = await login(username, password)
    res.json(data)
  } catch (e) {
    res.status(401).json({ error: e.message })
  }
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ username: req.auth.username })
})

app.patch('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {}
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva contraseña requeridas' })
    }
    await changePassword(Number(req.auth.sub), currentPassword, newPassword)
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// --- Ranking global (solo pádel: jugadores entre torneos) ---
app.get('/api/ranking/global', async (req, res) => {
  try {
    const list = await tournamentsRepo.getAllPadelWithState()
    const byName = new Map()
    for (const t of list) {
      const players = t?.state?.players || []
      for (const p of players) {
        const name = (p.name || '').trim() || 'Sin nombre'
        const sets = p.totalSets ?? 0
        const games = p.totalGames ?? 0
        const matches = p.totalMatches ?? 0
        if (sets === 0 && games === 0 && matches === 0) continue
        if (!byName.has(name)) {
          byName.set(name, { name, totalSets: 0, totalGames: 0, totalMatches: 0, tournamentsPlayed: 0 })
        }
        const entry = byName.get(name)
        entry.totalSets += sets
        entry.totalGames += games
        entry.totalMatches += matches
        entry.tournamentsPlayed += 1
      }
    }
    const result = Array.from(byName.values()).sort((a, b) => {
      if (b.totalSets !== a.totalSets) return b.totalSets - a.totalSets
      return (b.totalGames || 0) - (a.totalGames || 0)
    })
    res.json(result)
  } catch (e) {
    console.error('GET /api/ranking/global error:', e)
    res.status(500).json({ error: e.message || 'Error al cargar ranking global' })
  }
})

// --- Torneos: listar (público) y crear (admin) ---
app.get('/api/tournaments', async (req, res) => {
  try {
    const status = req.query.status || null
    const list = await tournamentsRepo.getAll(status ? { status } : {})
    res.json(list)
  } catch (e) {
    console.error('GET /api/tournaments error:', e)
    res.status(500).json({ error: e.message || 'Error al listar torneos' })
  }
})

app.post('/api/tournaments', requireAuth, async (req, res) => {
  try {
    const { name, sport, modality, status, start_date, end_date, rules } = req.body || {}
    const state = sport === 'padel' && (modality === 'escalera' || !modality) ? defaultState() : null
    const row = await tournamentsRepo.create({
      name: name && String(name).trim() ? String(name).trim() : undefined,
      sport: sport || 'padel',
      modality: modality || (sport === 'padel' ? 'escalera' : 'liga'),
      status: status || 'active',
      start_date: start_date || null,
      end_date: end_date || null,
      rules: rules != null ? rules : '',
      state_json: state ? JSON.stringify(state) : null,
    })
    res.status(201).json({
      id: row.id,
      name: row.name,
      sport: row.sport,
      modality: row.modality,
      status: row.status,
      start_date: row.start_date,
      end_date: row.end_date,
      rules: row.rules,
      createdAt: row.createdAt,
      state: row.state,
    })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// --- Torneo por id: ver (público), actualizar y eliminar (admin) ---
app.get('/api/tournament/:id', async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    res.json({
      id: t.id,
      name: t.name,
      sport: t.sport,
      modality: t.modality,
      status: t.status,
      start_date: t.start_date,
      end_date: t.end_date,
      rules: t.rules,
      createdAt: t.createdAt,
      state: t.state,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/tournament/:id', requireAuth, async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    const { name, sport, modality, status, start_date, end_date, rules } = req.body || {}
    const updates = {}
    if (name != null && String(name).trim()) updates.name = String(name).trim()
    if (sport != null) updates.sport = sport
    if (modality != null) updates.modality = modality
    if (status != null) updates.status = status
    if (start_date !== undefined) updates.start_date = start_date
    if (end_date !== undefined) updates.end_date = end_date
    if (rules !== undefined) updates.rules = rules
    const updated = await tournamentsRepo.update(req.params.id, updates)
    res.json(updated)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.delete('/api/tournament/:id', requireAuth, async (req, res) => {
  try {
    const ok = await tournamentsRepo.remove(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Torneo no encontrado' })
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Rutas por torneo PÁDEL (estado, config, jugadores, fechas, partidos) ---
app.get('/api/tournament/:id/state', async (req, res) => {
  try {
    const data = await withTournament(req.params.id, () => getState())
    res.json(data)
  } catch (e) {
    res.status(404).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/config', async (req, res) => {
  try {
    const data = await withTournament(req.params.id, () => {
      const s = getState()
      return { config: s.config }
    })
    res.json(data)
  } catch (e) {
    res.status(404).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/ranking', async (req, res) => {
  try {
    const data = await withTournament(req.params.id, () => getRanking() || { byCourt: {}, global: [] })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/reset', requireAuth, async (req, res) => {
  try {
    const data = await withTournament(req.params.id, () => {
      reset()
      return getState()
    })
    res.json(data)
  } catch (e) {
    res.status(404).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/config', requireAuth, async (req, res) => {
  try {
    const { numCourts, numPlayers } = req.body
    const data = await withTournament(req.params.id, () => {
      setConfig(Number(numCourts), Number(numPlayers))
      return getState()
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/players', requireAuth, async (req, res) => {
  try {
    const { names } = req.body
    const data = await withTournament(req.params.id, () => {
      addPlayers(names)
      return getState()
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/date/start', requireAuth, async (req, res) => {
  try {
    const data = await withTournament(req.params.id, () => {
      let dateData = getCurrentDateData()
      const noMatches = !dateData || !dateData.matches || dateData.matches.length === 0
      if (!dateData || noMatches) {
        generateDateMatches()
        dateData = getCurrentDateData()
      }
      return { date: dateData, state: getState() }
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/date/generate', requireAuth, async (req, res) => {
  try {
    const data = await withTournament(req.params.id, () => {
      const dateData = generateDateMatches()
      return { date: dateData, state: getState() }
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/match/:matchId/score', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params
    const { setIndex, pair1Games, pair2Games } = req.body
    const data = await withTournament(req.params.id, () => {
      setSetScore(matchId, setIndex, pair1Games, pair2Games)
      return getState()
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/match/:matchId/scores', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params
    const { sets } = req.body || {}
    const data = await withTournament(req.params.id, () => {
      setMatchScores(matchId, sets)
      return getState()
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/match/:matchId/complete', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params
    const data = await withTournament(req.params.id, () => {
      completeMatch(matchId)
      return getState()
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/date/complete', requireAuth, async (req, res) => {
  try {
    const data = await withTournament(req.params.id, () => {
      completeDate()
      return getState()
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/date/can-complete', async (req, res) => {
  try {
    const data = await withTournament(req.params.id, () => ({ canComplete: allMatchesInDateComplete() }))
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/date/next', requireAuth, async (req, res) => {
  try {
    const data = await withTournament(req.params.id, () => {
      const dateData = startNextDate()
      return { date: dateData, state: getState() }
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// --- Liga (fútbol/hockey): config, equipos, jornadas, partidos, goles, tablas ---

app.get('/api/tournament/:id/league/config', async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    const config = await leagueRepo.getConfig(req.params.id)
    res.json(config)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/tournament/:id/league/config', requireAuth, async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    const config = await leagueRepo.upsertConfig(req.params.id, req.body || {})
    res.json(config)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/league/generate-fixture', requireAuth, async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    const result = await leagueRepo.generateFixture(req.params.id, req.body || {})
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/league/zones', async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    const zones = await leagueRepo.getZones(req.params.id)
    res.json(zones)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/league/zones', requireAuth, async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    const zone = await leagueRepo.createZone(req.params.id, req.body || {})
    res.status(201).json(zone)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.patch('/api/tournament/:id/league/zones/:zoneId', requireAuth, async (req, res) => {
  try {
    const zone = await leagueRepo.updateZone(req.params.zoneId, req.body || {})
    if (!zone) return res.status(404).json({ error: 'Zona no encontrada' })
    res.json(zone)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.delete('/api/tournament/:id/league/zones/:zoneId', requireAuth, async (req, res) => {
  try {
    const ok = await leagueRepo.deleteZone(req.params.zoneId)
    if (!ok) return res.status(404).json({ error: 'Zona no encontrada' })
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/league/current-matchday', async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    const matchday = await leagueRepo.getCurrentMatchday(req.params.id)
    res.json(matchday || null)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/league/teams', async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    const zoneId = req.query.zone_id || null
    const teams = await leagueRepo.getTeams(req.params.id, { zoneId })
    res.json(teams)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/league/draw-zones', requireAuth, async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    const numZones = Number(req.body?.num_zones) || 0
    const result = await leagueRepo.drawAndCreateZones(req.params.id, numZones)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/league/teams', requireAuth, async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    const team = await leagueRepo.createTeam(req.params.id, req.body || {})
    res.status(201).json(team)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.patch('/api/tournament/:id/league/teams/:teamId', requireAuth, async (req, res) => {
  try {
    const team = await leagueRepo.updateTeam(req.params.teamId, req.body || {})
    if (!team) return res.status(404).json({ error: 'Equipo no encontrado' })
    res.json(team)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.delete('/api/tournament/:id/league/teams/:teamId', requireAuth, async (req, res) => {
  try {
    const ok = await leagueRepo.deleteTeam(req.params.teamId)
    if (!ok) return res.status(404).json({ error: 'Equipo no encontrado' })
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/league/teams/:teamId/players', async (req, res) => {
  try {
    const players = await leagueRepo.getTeamPlayers(req.params.teamId)
    res.json(players)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/league/teams/:teamId/detail', async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    const { teamId } = req.params
    const teams = await leagueRepo.getTeams(req.params.id)
    const team = teams.find((x) => x.id === teamId)
    if (!team) return res.status(404).json({ error: 'Equipo no encontrado' })
    const [players, scorers, discipline, matchesSummary] = await Promise.all([
      leagueRepo.getTeamPlayers(teamId),
      leagueRepo.getScorersByTeam(req.params.id, teamId),
      leagueRepo.getDisciplineByTeam(req.params.id, teamId),
      leagueRepo.getTeamMatchesSummary(req.params.id, teamId),
    ])
    const { previousMatch, previousMatches = [], currentMatch, nextMatch, nextAfterCurrent } = matchesSummary
    const playedIds = [...previousMatches.filter((m) => m.status === 'played').map((m) => m.id)]
    if (currentMatch?.status === 'played') playedIds.push(currentMatch.id)
    const [goalsByMatch, cardsByMatch] = playedIds.length
      ? await Promise.all([
          leagueRepo.getGoalsByMatchIds(playedIds),
          leagueRepo.getCardsByMatchIds(playedIds),
        ])
      : [{}, {}]
    const previousWithDetail = previousMatch
      ? {
          ...previousMatch,
          ...(previousMatch.status === 'played' && {
            goals: goalsByMatch[previousMatch.id] || [],
            cards: cardsByMatch[previousMatch.id] || [],
          }),
        }
      : null
    const previousMatchesWithDetail = previousMatches.map((m) => ({
      ...m,
      ...(m.status === 'played' && {
        goals: goalsByMatch[m.id] || [],
        cards: cardsByMatch[m.id] || [],
      }),
    }))
    const currentWithDetail = currentMatch
      ? {
          ...currentMatch,
          ...(currentMatch.status === 'played' && {
            goals: goalsByMatch[currentMatch.id] || [],
            cards: cardsByMatch[currentMatch.id] || [],
          }),
        }
      : null
    res.json({
      team,
      players,
      scorers,
      discipline,
      nextMatch: nextMatch || null,
      nextAfterCurrent: nextAfterCurrent || null,
      previousMatch: previousWithDetail,
      previousMatches: previousMatchesWithDetail,
      currentMatch: currentWithDetail,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/league/players', async (req, res) => {
  try {
    const teamIds = (req.query.team_ids || '').split(',').filter(Boolean)
    if (teamIds.length === 0) return res.json({})
    const byTeam = await leagueRepo.getPlayersByTeamIds(teamIds)
    res.json(byTeam)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/league/teams/:teamId/players', requireAuth, async (req, res) => {
  try {
    const player = await leagueRepo.createTeamPlayer(req.params.teamId, req.body || {})
    res.status(201).json(player)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.patch('/api/tournament/:id/league/teams/:teamId/players/:playerId', requireAuth, async (req, res) => {
  try {
    const player = await leagueRepo.updateTeamPlayer(req.params.playerId, req.body || {})
    if (!player) return res.status(404).json({ error: 'Jugador no encontrado' })
    res.json(player)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.delete('/api/tournament/:id/league/teams/:teamId/players/:playerId', requireAuth, async (req, res) => {
  try {
    const ok = await leagueRepo.deleteTeamPlayer(req.params.playerId)
    if (!ok) return res.status(404).json({ error: 'Jugador no encontrado' })
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/league/matchdays', async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    const matchdays = await leagueRepo.getMatchdays(req.params.id)
    res.json(matchdays)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/league/matchdays', requireAuth, async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    const { number } = req.body || {}
    const matchday = await leagueRepo.createMatchday(req.params.id, number ?? 0)
    res.status(201).json(matchday)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.delete('/api/tournament/:id/league/matchdays/:matchdayId', requireAuth, async (req, res) => {
  try {
    const ok = await leagueRepo.deleteMatchday(req.params.matchdayId)
    if (!ok) return res.status(404).json({ error: 'Jornada no encontrada' })
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/league/matchdays/:matchdayId/matches', async (req, res) => {
  try {
    const zoneId = req.query.zone_id || null
    const matches = await leagueRepo.getMatchesByMatchday(req.params.matchdayId, { zoneId })
    res.json(matches)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/league/matchdays/:matchdayId/matches', requireAuth, async (req, res) => {
  try {
    const { home_team_id, away_team_id, played_at } = req.body || {}
    if (!home_team_id || !away_team_id) return res.status(400).json({ error: 'home_team_id y away_team_id requeridos' })
    const match = await leagueRepo.createMatch(req.params.matchdayId, home_team_id, away_team_id, played_at || null)
    res.status(201).json(match)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.patch('/api/tournament/:id/league/matches/:matchId', requireAuth, async (req, res) => {
  try {
    const { home_score, away_score, home_games, away_games, played_at, status } = req.body || {}
    const match = await leagueRepo.updateMatch(req.params.matchId, { home_score, away_score, home_games, away_games, played_at, status })
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' })
    res.json(match)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.delete('/api/tournament/:id/league/matches/:matchId', requireAuth, async (req, res) => {
  try {
    const ok = await leagueRepo.deleteMatch(req.params.matchId)
    if (!ok) return res.status(404).json({ error: 'Partido no encontrado' })
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/league/matches/:matchId/goals', async (req, res) => {
  try {
    const goals = await leagueRepo.getGoalsByMatch(req.params.matchId)
    res.json(goals)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/league/matches/:matchId/goals', requireAuth, async (req, res) => {
  try {
    const goal = await leagueRepo.addGoal(req.params.matchId, req.body || {})
    res.status(201).json(goal)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.delete('/api/tournament/:id/league/goals/:goalId', requireAuth, async (req, res) => {
  try {
    const ok = await leagueRepo.deleteGoal(req.params.goalId)
    if (!ok) return res.status(404).json({ error: 'Gol no encontrado' })
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/league/matches/:matchId/cards', async (req, res) => {
  try {
    const cards = await leagueRepo.getCardsByMatch(req.params.matchId)
    res.json(cards)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/league/matches/:matchId/cards', requireAuth, async (req, res) => {
  try {
    const card = await leagueRepo.addCard(req.params.matchId, req.body || {})
    res.status(201).json(card)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.delete('/api/tournament/:id/league/cards/:cardId', requireAuth, async (req, res) => {
  try {
    const ok = await leagueRepo.deleteCard(req.params.cardId)
    if (!ok) return res.status(404).json({ error: 'Tarjeta no encontrada' })
    res.status(204).send()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/league/standings', async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    const zoneId = req.query.zone_id || null
    const standings = await leagueRepo.getStandings(req.params.id, { zoneId, sport: t.sport })
    res.json(standings)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/league/scorers', async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    const zoneId = req.query.zone_id || null
    const global = req.query.global === '1' || req.query.global === 'true'
    const scorers = global ? await leagueRepo.getScorersGlobal(req.params.id, { zoneId }) : await leagueRepo.getScorers(req.params.id, { zoneId })
    res.json(scorers)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/league/discipline', async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    const zoneId = req.query.zone_id || null
    const global = req.query.global === '1' || req.query.global === 'true'
    const discipline = global ? await leagueRepo.getDisciplineGlobal(req.params.id, { zoneId }) : await leagueRepo.getDiscipline(req.params.id, { zoneId })
    res.json(discipline)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Playoffs (solo formato "Fase de Grupos"; formato Liga no tiene fase eliminatoria) ---
app.get('/api/tournament/:id/league/playoff/bracket', async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    if (t.modality === 'liga') return res.json([]) // Formato Liga: sin playoffs, campeón por tabla
    const bracket = await leagueRepo.getPlayoffBracket(req.params.id)
    res.json(bracket)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/league/playoff/generate', requireAuth, async (req, res) => {
  try {
    const t = await tournamentsRepo.getById(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    if (!isLeagueTournament(t)) return res.status(400).json({ error: 'Torneo no es de liga' })
    if (t.modality === 'liga') return res.status(400).json({ error: 'El formato Liga no tiene fase eliminatoria. El campeón se define únicamente por la posición en la tabla.' })
    const bracket = await leagueRepo.generatePlayoffBracket(req.params.id)
    res.json(bracket)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.patch('/api/tournament/:id/league/playoff/matches/:matchId', requireAuth, async (req, res) => {
  try {
    const { home_score, away_score, status, played_at } = req.body || {}
    const match = await leagueRepo.updatePlayoffMatch(req.params.matchId, { home_score, away_score, status, played_at })
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' })
    if (status === 'played' && match.home_team_id && match.away_team_id) {
      const h = match.home_score ?? 0
      const a = match.away_score ?? 0
      const winnerId = h > a ? match.home_team_id : a > h ? match.away_team_id : null
      if (winnerId) await leagueRepo.setPlayoffWinner(req.params.matchId, winnerId)
    }
    const bracket = await leagueRepo.getPlayoffBracket(req.params.id)
    res.json(bracket)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/league/playoff/matches/:matchId/goals', async (req, res) => {
  try {
    const goals = await leagueRepo.getPlayoffGoalsByMatch(req.params.matchId)
    res.json(goals)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/league/playoff/matches/:matchId/goals', requireAuth, async (req, res) => {
  try {
    const goal = await leagueRepo.addPlayoffGoal(req.params.matchId, req.body || {})
    res.status(201).json(goal)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/league/playoff/matches/:matchId/cards', async (req, res) => {
  try {
    const cards = await leagueRepo.getPlayoffCardsByMatch(req.params.matchId)
    res.json(cards)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/league/playoff/matches/:matchId/cards', requireAuth, async (req, res) => {
  try {
    const card = await leagueRepo.addPlayoffCard(req.params.matchId, req.body || {})
    res.status(201).json(card)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// --- Arranque ---
// Escuchar en 0.0.0.0 (Railway requiere acceso externo); init DB en background
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor en http://localhost:${PORT}`)
  console.log(`API: http://localhost:${PORT}/api/health`)
  console.log(`Torneos: http://localhost:${PORT}/api/tournaments`)
  ensureSchema()
    .then(() => seedAdmin())
    .then(() => console.log('[Spectra] Base de datos lista'))
    .catch((err) => console.error('[Spectra] Error init DB:', err.message))
})
