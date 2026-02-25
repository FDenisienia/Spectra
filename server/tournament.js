/**
 * Torneo por fechas y canchas — cantidad de jugadores flexible.
 * - Cada cancha base admite 4 jugadores. Si N > C*4, los excedentes se distribuyen secuencialmente (cancha 1, 2, 3...).
 * - Por fecha, por cancha: bloques de 4, 1 bloque descansa (rotando) si hay 2+ bloques; cada otro bloque = 1 partido.
 * - Primera fecha: clasificatoria (no se aplica escalera).
 * - A partir de la fecha 2: se aplica escalera (suben 2, bajan 2) al finalizar cada fecha.
 */

const SETS_PER_MATCH = 3
const BLOCK_SIZE = 4
const QUALIFYING_DATES = 1

const defaultState = () => ({
  config: null,
  players: [],
  currentDate: 0,
  dates: [],
  status: 'config',
})

let state = defaultState()

/** Carga el estado desde fuera (para multi-torneo). */
function initState(loaded) {
  state = loaded
    ? JSON.parse(JSON.stringify(loaded))
    : defaultState()
  // Compatibilidad: torneos antiguos sin playersPerCourtByCourt
  if (state.config && !state.config.playersPerCourtByCourt && state.config.numCourts && state.config.numPlayers) {
    state.config.playersPerCourtByCourt = getPlayersPerCourtArray(state.config.numCourts, state.config.numPlayers)
  }
  return state
}

function reset() {
  state = defaultState()
}

/**
 * Distribución de jugadores por cancha:
 * - Base: 4 por cancha (capacidad_base = C × 4).
 * - Si N > capacidad_base, excedentes se asignan 1 por cancha secuencialmente (cancha 1 → 2 → 3 → …).
 * - Devuelve array [count0, count1, …] para cada cancha.
 */
function getPlayersPerCourtArray(numCourts, numPlayers) {
  const capacityBase = numCourts * BLOCK_SIZE
  if (numPlayers < capacityBase) return null
  const excess = numPlayers - capacityBase
  const q = Math.floor(excess / numCourts)
  const r = excess % numCourts
  return Array.from({ length: numCourts }, (_, c) => BLOCK_SIZE + q + (c < r ? 1 : 0))
}

function setConfig(numCourts, numPlayers) {
  if (numCourts < 1) throw new Error('Debe haber al menos una cancha')
  if (numPlayers < numCourts * BLOCK_SIZE) {
    throw new Error(`Mínimo ${numCourts * BLOCK_SIZE} jugadores (4 por cancha)`)
  }
  const playersPerCourtByCourt = getPlayersPerCourtArray(numCourts, numPlayers)
  if (!playersPerCourtByCourt || playersPerCourtByCourt.reduce((a, b) => a + b, 0) !== numPlayers) {
    throw new Error('Error al calcular la distribución de jugadores')
  }
  state.config = { numCourts, numPlayers, playersPerCourtByCourt, qualifyingDates: QUALIFYING_DATES }
  state.players = []
  state.currentDate = 0
  state.dates = []
  state.status = 'players'
  return state
}

function addPlayers(names) {
  if (!state.config) throw new Error('Configura primero canchas y número de jugadores')
  if (names.length !== state.config.numPlayers) {
    throw new Error(`Debes cargar exactamente ${state.config.numPlayers} jugadores`)
  }
  const { numCourts, playersPerCourtByCourt } = state.config
  state.players = names.map((name, i) => {
    let courtIndex = 0
    let acc = playersPerCourtByCourt[0]
    while (i >= acc && courtIndex < numCourts - 1) {
      courtIndex++
      acc += playersPerCourtByCourt[courtIndex]
    }
    const offset = courtIndex > 0 ? playersPerCourtByCourt.slice(0, courtIndex).reduce((a, b) => a + b, 0) : 0
    const positionInCourt = i - offset + 1
    return {
      id: `p-${i + 1}`,
      name: name.trim() || `Jugador ${i + 1}`,
      courtIndex,
      positionInCourt,
      gamesInDate: 0,
      setsWonInDate: 0,
      matchesPlayedInDate: 0,
      totalGames: 0,
      totalSets: 0,
      totalMatches: 0,
    }
  })
  state.status = 'date'
  state.currentDate = 1
  return state
}

/**
 * Qué bloque descansa en esta fecha (rotación: bloque 0, 1, 2, ... por fecha).
 */
function getRestBlockForDate(dateIndex, numBlocks) {
  if (numBlocks <= 1) return 0
  return dateIndex % numBlocks
}

/**
 * Rotación de parejas: cada jugador juega 1 set con cada uno de los otros 3.
 * Con [a,b,c,d]: Set 0: (a,b) vs (c,d), Set 1: (a,c) vs (b,d), Set 2: (a,d) vs (b,c)
 */
function getRotatedPairsForBlock(a, b, c, d) {
  return [
    { pair1: [a, b], pair2: [c, d] },
    { pair1: [a, c], pair2: [b, d] },
    { pair1: [a, d], pair2: [b, c] },
  ]
}

/**
 * Por cancha: N jugadores (múltiplo de 4). Un bloque de 4 descansa (solo si hay 2+ bloques), cada otro bloque = 1 partido.
 * Cada partido tiene 3 sets con rotación de parejas: cada jugador juega 1 set con cada uno de los otros 3.
 */
function generateMatchesForCourt(courtPlayers, dateIndex, courtIndex) {
  const safe = (courtPlayers || []).filter((p) => p != null && p.id != null)
  if (safe.length < BLOCK_SIZE) return []
  const numBlocks = Math.floor(safe.length / BLOCK_SIZE)
  const restBlock = getRestBlockForDate(dateIndex, numBlocks)
  const matches = []
  for (let block = 0; block < numBlocks; block++) {
    if (numBlocks > 1 && block === restBlock) continue
    const base = block * BLOCK_SIZE
    const a = safe[base]?.id
    const b = safe[base + 1]?.id
    const c = safe[base + 2]?.id
    const d = safe[base + 3]?.id
    if (a == null || b == null || c == null || d == null) continue
    const rotated = getRotatedPairsForBlock(a, b, c, d)
    matches.push({
      id: `date${dateIndex + 1}-c${courtIndex}-b${block}`,
      courtIndex,
      blockIndex: block,
      pair1: [a, b],
      pair2: [c, d],
      sets: rotated.map(({ pair1, pair2 }) => ({
        pair1,
        pair2,
        pair1Games: 0,
        pair2Games: 0,
      })),
      completed: false,
    })
  }
  return matches
}

function generateDateMatches() {
  if (!state.config) throw new Error('Faltan configuración del torneo. Reiniciá desde Configuración.')
  if (!state.players.length) throw new Error('No hay jugadores cargados. Reiniciá y cargá los jugadores.')
  const { numCourts, numPlayers } = state.config
  if (state.players.length !== numPlayers) {
    throw new Error(`Se esperan ${numPlayers} jugadores. Reiniciá el torneo y cargá exactamente ${numPlayers} nombres.`)
  }
  const missingCourt = state.players.some((p) => p.courtIndex == null || p.positionInCourt == null)
  if (missingCourt) {
    throw new Error('Estado de jugadores incompatible. Reiniciá el torneo desde Configuración y volvé a cargar jugadores.')
  }
  const dateIndex = state.currentDate - 1
  if (dateIndex < 0) throw new Error('Ronda inválida.')
  const { playersPerCourtByCourt } = state.config

  if (!state.dates || !Array.isArray(state.dates)) state.dates = []

  const dateData = {
    dateIndex: state.currentDate,
    restByCourt: [],
    courtAssignments: [],
    matches: [],
    completed: false,
    completedMatchOrder: [],
  }

  for (let c = 0; c < numCourts; c++) {
    const expectedCount = playersPerCourtByCourt[c]
    const numBlocksPerCourt = Math.floor(expectedCount / BLOCK_SIZE)
    const courtPlayers = state.players
      .filter((p) => p != null && p.courtIndex === c)
      .sort((a, b) => a.positionInCourt - b.positionInCourt)
    if (courtPlayers.length !== expectedCount) {
      throw new Error(
        `Cancha ${c + 1} tiene ${courtPlayers.length} jugadores (debería tener ${expectedCount}). Reiniciá el torneo desde Configuración.`
      )
    }
    const restBlock = getRestBlockForDate(dateIndex, numBlocksPerCourt)
    dateData.restByCourt[c] = numBlocksPerCourt > 1
      ? courtPlayers.slice(restBlock * BLOCK_SIZE, (restBlock + 1) * BLOCK_SIZE).map((p) => p.id)
      : []
    dateData.courtAssignments[c] = courtPlayers.map((p) => p.id)
    const courtMatches = generateMatchesForCourt(courtPlayers, dateIndex, c)
    dateData.matches.push(...courtMatches)
  }

  state.dates[dateIndex] = dateData
  return dateData
}

function getCurrentDateData() {
  if (state.currentDate < 1 || !state.dates[state.currentDate - 1]) return null
  return state.dates[state.currentDate - 1]
}

function getMatchById(dateData, matchId) {
  return (dateData.matches || []).find((m) => m.id === matchId)
}

function getPlayerIdsInMatch(match) {
  return [...(match.pair1 || []), ...(match.pair2 || [])]
}

function getPlayersWhoNeedRest(dateData, matchId) {
  const match = getMatchById(dateData, matchId)
  if (!match) return []
  const playerIds = getPlayerIdsInMatch(match)
  const order = dateData.completedMatchOrder || []
  if (order.length === 0) return []
  const needRest = []
  for (const pid of playerIds) {
    let lastIndex = -1
    for (let i = order.length - 1; i >= 0; i--) {
      const m = getMatchById(dateData, order[i])
      if (m && getPlayerIdsInMatch(m).includes(pid)) {
        lastIndex = i
        break
      }
    }
    if (lastIndex === order.length - 1) {
      const p = state.players.find((x) => x.id === pid)
      if (p) needRest.push(p.name)
    }
  }
  return needRest
}

function setSetScore(matchId, setIndex, pair1Games, pair2Games) {
  const dateData = getCurrentDateData()
  if (!dateData) throw new Error('No hay fecha en curso')
  const match = getMatchById(dateData, matchId)
  if (!match) throw new Error('Partido no encontrado')
  if (setIndex < 0 || setIndex >= SETS_PER_MATCH) throw new Error('Set inválido')
  const existing = match.sets[setIndex] || {}
  match.sets[setIndex] = {
    pair1: existing.pair1,
    pair2: existing.pair2,
    pair1Games: Number(pair1Games),
    pair2Games: Number(pair2Games),
  }
  return match
}

/** Aplica todos los sets de un partido en una sola operación (menos round-trips). */
function setMatchScores(matchId, sets) {
  if (!Array.isArray(sets) || sets.length === 0) throw new Error('Se requieren los resultados de los sets')
  for (let i = 0; i < Math.min(sets.length, SETS_PER_MATCH); i++) {
    const s = sets[i]
    setSetScore(matchId, i, s.pair1Games ?? 0, s.pair2Games ?? 0)
  }
  return getMatchById(getCurrentDateData(), matchId)
}

function completeMatch(matchId) {
  const dateData = getCurrentDateData()
  if (!dateData) throw new Error('No hay fecha en curso')
  const match = getMatchById(dateData, matchId)
  if (!match) throw new Error('Partido no encontrado')
  if (match.completed) throw new Error('Ese partido ya está finalizado')

  const needRest = getPlayersWhoNeedRest(dateData, matchId)
  if (needRest.length > 0) {
    throw new Error(`Deben descansar antes de jugar de nuevo: ${needRest.join(', ')}. Completá otro partido primero.`)
  }

  const allPlayerIds = [...new Set([...(match.pair1 || []), ...(match.pair2 || [])])]

  allPlayerIds.forEach((id) => {
    const p = state.players.find((x) => x.id === id)
    if (p) p.matchesPlayedInDate++
  })

  match.sets.forEach((set) => {
    const pair1 = set.pair1 || match.pair1 || []
    const pair2 = set.pair2 || match.pair2 || []
    const p1Won = set.pair1Games > set.pair2Games
    const p2Won = set.pair2Games > set.pair1Games
    ;[...pair1, ...pair2].forEach((id) => {
      const p = state.players.find((x) => x.id === id)
      if (!p) return
      if (pair1.includes(id)) {
        p.gamesInDate += set.pair1Games ?? 0
        if (p1Won) p.setsWonInDate++
      } else {
        p.gamesInDate += set.pair2Games ?? 0
        if (p2Won) p.setsWonInDate++
      }
    })
  })

  match.completed = true
  if (!dateData.completedMatchOrder) dateData.completedMatchOrder = []
  dateData.completedMatchOrder.push(matchId)
  return match
}

function allMatchesInDateComplete() {
  const dateData = getCurrentDateData()
  if (!dateData || !Array.isArray(dateData.matches) || dateData.matches.length === 0) return false
  return dateData.matches.every((m) => m && m.completed)
}

function getRankingForDate() {
  const { numCourts } = state.config
  const byCourt = {}
  const players = (state.players || []).filter((p) => p != null && p.id != null)
  for (let c = 0; c < numCourts; c++) {
    byCourt[c] = players
      .filter((p) => p.courtIndex === c)
      .map((p) => ({ ...p }))
      .sort((a, b) => {
        if (b.setsWonInDate !== a.setsWonInDate) return b.setsWonInDate - a.setsWonInDate
        return b.gamesInDate - a.gamesInDate
      })
      .map((p, i) => ({ ...p, positionInCourt: i + 1 }))
  }
  return byCourt
}

/**
 * Shuffle array (Fisher-Yates) con semilla opcional para variar equipos por fecha.
 */
function shuffleWithSeed(arr, seed) {
  const a = [...arr]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280
    const j = Math.floor((s / 233280) * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Escalera circular: suben 2 (pos 1-2), bajan 2 (últimas 2).
 * Los que bajan de cancha 1 van a la 2, de la 2 a la 3, etc. (circular).
 * Los del medio se quedan. Tras asignar, se mezclan para variar equipos.
 */
function applyLadderMovement(byCourt) {
  const numCourts = state.config.numCourts
  if (numCourts === 1) return

  const movements = []
  for (let c = 0; c < numCourts; c++) {
    const courtPlayers = (byCourt[c] || []).filter((p) => p != null && p.id != null)
    const up = courtPlayers.filter((_, i) => i < 2).map((p) => p.id).filter(Boolean)
    const down = courtPlayers.filter((_, i) => i >= courtPlayers.length - 2).map((p) => p.id).filter(Boolean)
    const middle = courtPlayers.slice(2, courtPlayers.length - 2).map((p) => p.id).filter(Boolean)
    movements.push({ up, down, middle })
  }

  const idToPlayer = {}
  state.players.forEach((p) => { if (p && p.id) idToPlayer[p.id] = p })

  for (let c = 0; c < numCourts; c++) {
    const prevCourt = (c - 1 + numCourts) % numCourts
    const nextCourt = (c + 1) % numCourts
    let ids = [
      ...movements[prevCourt].down,
      ...movements[c].middle,
      ...movements[nextCourt].up,
    ]
    ids = shuffleWithSeed(ids, state.currentDate * 10 + c)
    ids.forEach((id, pos) => {
      const p = idToPlayer[id]
      if (p) {
        p.courtIndex = c
        p.positionInCourt = pos + 1
      }
    })
  }
}

function completeDate() {
  const dateData = getCurrentDateData()
  if (!dateData) throw new Error('No hay fecha en curso')
  if (!allMatchesInDateComplete()) {
    throw new Error('Faltan partidos por completar en esta fecha')
  }

  state.players.forEach((p) => {
    p.totalGames = (p.totalGames || 0) + (p.gamesInDate || 0)
    p.totalSets = (p.totalSets || 0) + (p.setsWonInDate || 0)
    p.totalMatches = (p.totalMatches || 0) + (p.matchesPlayedInDate || 0)
  })

  const byCourt = getRankingForDate()
  // Registro de la fecha: sets y games de cada jugador en esta fecha (para mostrar al ver fechas pasadas)
  const allPlayersThisDate = []
  for (let c = 0; c < state.config.numCourts; c++) {
    (byCourt[c] || []).forEach((p) => allPlayersThisDate.push({ ...p }))
  }
  const globalForDate = [...allPlayersThisDate].sort((a, b) => {
    if ((b.setsWonInDate ?? 0) !== (a.setsWonInDate ?? 0)) return (b.setsWonInDate ?? 0) - (a.setsWonInDate ?? 0)
    return (b.gamesInDate ?? 0) - (a.gamesInDate ?? 0)
  }).map((p, i) => ({ ...p, globalPosition: i + 1 }))
  dateData.rankingAtEnd = { byCourt, global: globalForDate }
  const numCourts = state.config.numCourts
  const isQualifying = state.currentDate < QUALIFYING_DATES
  dateData.isQualifying = isQualifying
  dateData.movements = []
  for (let c = 0; c < numCourts; c++) {
    const courtPlayers = byCourt[c]
    const up = courtPlayers.filter((_, i) => i < 2).map((p) => p.id)
    const down = courtPlayers.filter((_, i) => i >= courtPlayers.length - 2).map((p) => p.id)
    dateData.movements.push({ courtIndex: c, up, down })
  }
  if (!isQualifying) {
    applyLadderMovement(byCourt)
  }

  state.players.forEach((p) => {
    p.gamesInDate = 0
    p.setsWonInDate = 0
    p.matchesPlayedInDate = 0
  })

  dateData.completed = true
  state.status = 'date_complete'
  return state
}

function startNextDate() {
  if (state.status !== 'date_complete') {
    throw new Error('Debes completar la fecha actual antes de iniciar la siguiente')
  }
  state.currentDate++
  state.status = 'date'
  return generateDateMatches()
}

function getState() {
  try {
    const copy = JSON.parse(JSON.stringify(state))
    if (Array.isArray(copy.players)) {
      copy.players = copy.players.filter((p) => p != null && p.id != null)
    }
    return copy
  } catch (_) {
    return {
      config: null,
      players: [],
      currentDate: 0,
      dates: [],
      status: 'config',
    }
  }
}

function getRanking() {
  if (!state.config || !state.players.length) return { byCourt: {}, global: [] }
  const { numCourts } = state.config
  const byCourt = {}
  for (let c = 0; c < numCourts; c++) {
    byCourt[c] = state.players
      .filter((p) => p.courtIndex === c)
      .sort((a, b) => {
        const aSets = a.totalSets ?? 0
        const bSets = b.totalSets ?? 0
        if (bSets !== aSets) return bSets - aSets
        return (b.totalGames ?? 0) - (a.totalGames ?? 0)
      })
      .map((p, i) => ({ ...p, positionInCourt: i + 1 }))
  }
  const global = [...state.players].sort((a, b) => {
    const aSets = a.totalSets ?? 0
    const bSets = b.totalSets ?? 0
    if (bSets !== aSets) return bSets - aSets
    return (b.totalGames ?? 0) - (a.totalGames ?? 0)
  }).map((p, i) => ({ ...p, globalPosition: i + 1 }))
  return { byCourt, global }
}

export {
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
  SETS_PER_MATCH,
  BLOCK_SIZE,
  QUALIFYING_DATES,
}
