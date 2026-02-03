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

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Almacén de torneos: id -> { id, name, createdAt, state }
const tournaments = new Map()

function generateId() {
  return 't-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9)
}

function withTournament(id, fn) {
  const t = tournaments.get(id)
  if (!t) throw new Error('Torneo no encontrado')
  initState(t.state)
  try {
    const result = fn()
    t.state = getState()
    return result
  } catch (e) {
    throw e
  }
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Spectra API funcionando',
    timestamp: new Date().toISOString(),
  })
})

// --- Ranking general entre torneos (por nombre de jugador) ---

app.get('/api/ranking/global', (req, res) => {
  try {
    const byName = new Map()
    for (const t of tournaments.values()) {
      const players = t.state?.players || []
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
    const list = Array.from(byName.values()).sort((a, b) => {
      if (b.totalSets !== a.totalSets) return b.totalSets - a.totalSets
      return (b.totalGames || 0) - (a.totalGames || 0)
    })
    res.json(list)
  } catch (e) {
    console.error('GET /api/ranking/global error:', e)
    res.status(500).json({ error: e.message || 'Error al cargar ranking global' })
  }
})

// --- Listar y crear torneos ---

app.get('/api/tournaments', (req, res) => {
  try {
    const list = Array.from(tournaments.values()).map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
      status: t.state?.status,
      config: t.state?.config,
      currentDate: t.state?.currentDate,
      datesCount: t.state?.dates?.length ?? 0,
    }))
    res.json(list)
  } catch (e) {
    console.error('GET /api/tournaments error:', e)
    res.status(500).json({ error: e.message || 'Error al listar torneos' })
  }
})

app.post('/api/tournaments', (req, res) => {
  try {
    const { name } = req.body || {}
    const id = generateId()
    const state = defaultState()
    tournaments.set(id, {
      id,
      name: name && String(name).trim() ? String(name).trim() : `Torneo ${id}`,
      createdAt: new Date().toISOString(),
      state,
    })
    const t = tournaments.get(id)
    res.status(201).json({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
      state: t.state,
    })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.get('/api/tournament/:id', (req, res) => {
  try {
    const t = tournaments.get(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    res.json({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
      state: t.state,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/tournament/:id', (req, res) => {
  try {
    const t = tournaments.get(req.params.id)
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' })
    const { name } = req.body || {}
    if (name != null && String(name).trim()) t.name = String(name).trim()
    res.json({ id: t.id, name: t.name, createdAt: t.createdAt })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.delete('/api/tournament/:id', (req, res) => {
  if (!tournaments.has(req.params.id)) return res.status(404).json({ error: 'Torneo no encontrado' })
  tournaments.delete(req.params.id)
  res.status(204).send()
})

// --- Rutas por torneo (todas bajo /api/tournament/:id/...) ---

app.get('/api/tournament/:id/state', (req, res) => {
  try {
    const data = withTournament(req.params.id, () => getState())
    res.json(data)
  } catch (e) {
    res.status(404).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/config', (req, res) => {
  try {
    const data = withTournament(req.params.id, () => {
      const s = getState()
      return { config: s.config }
    })
    res.json(data)
  } catch (e) {
    res.status(404).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/ranking', (req, res) => {
  try {
    const data = withTournament(req.params.id, () => getRanking() || { byCourt: {}, global: [] })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/reset', (req, res) => {
  try {
    const data = withTournament(req.params.id, () => {
      reset()
      return getState()
    })
    res.json(data)
  } catch (e) {
    res.status(404).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/config', (req, res) => {
  try {
    const { numCourts, numPlayers } = req.body
    const data = withTournament(req.params.id, () => {
      setConfig(Number(numCourts), Number(numPlayers))
      return getState()
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/players', (req, res) => {
  try {
    const { names } = req.body
    const data = withTournament(req.params.id, () => {
      addPlayers(names)
      return getState()
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/date/start', (req, res) => {
  try {
    const data = withTournament(req.params.id, () => {
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

app.post('/api/tournament/:id/date/generate', (req, res) => {
  try {
    const data = withTournament(req.params.id, () => {
      const dateData = generateDateMatches()
      return { date: dateData, state: getState() }
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/match/:matchId/score', (req, res) => {
  try {
    const { matchId } = req.params
    const { setIndex, pair1Games, pair2Games } = req.body
    const data = withTournament(req.params.id, () => {
      setSetScore(matchId, setIndex, pair1Games, pair2Games)
      return getState()
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/match/:matchId/scores', (req, res) => {
  try {
    const { matchId } = req.params
    const { sets } = req.body || {}
    const data = withTournament(req.params.id, () => {
      setMatchScores(matchId, sets)
      return getState()
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/match/:matchId/complete', (req, res) => {
  try {
    const { matchId } = req.params
    const data = withTournament(req.params.id, () => {
      completeMatch(matchId)
      return getState()
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/date/complete', (req, res) => {
  try {
    const data = withTournament(req.params.id, () => {
      completeDate()
      return getState()
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.get('/api/tournament/:id/date/can-complete', (req, res) => {
  try {
    const data = withTournament(req.params.id, () => ({ canComplete: allMatchesInDateComplete() }))
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/tournament/:id/date/next', (req, res) => {
  try {
    const data = withTournament(req.params.id, () => {
      const dateData = startNextDate()
      return { date: dateData, state: getState() }
    })
    res.json(data)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`)
  console.log(`API: http://localhost:${PORT}/api/health`)
  console.log(`Torneos: http://localhost:${PORT}/api/tournaments`)
})