/**
 * Validación reutilizable: coherencia entre marcador y eventos (goles/tarjetas).
 * Usar desde formularios de liga u otros módulos que sigan el mismo modelo de datos.
 */

export const MSG_GOALS_TOTAL_MISMATCH =
  'La cantidad de goles cargados no coincide con el resultado del partido.'

/** Suma de goles según filas de eventos (cada fila aporta al menos 1 gol). */
export function sumLoadedGoals(goals) {
  return (goals || []).reduce((s, g) => {
    const n = Number(g?.goals)
    return s + (Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1)
  }, 0)
}

export function sumGoalsByTeam(goals, teamId) {
  const tid = teamId != null ? String(teamId) : ''
  return (goals || [])
    .filter((g) => String(g?.team_id) === tid)
    .reduce((s, g) => {
      const n = Number(g?.goals)
      return s + (Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1)
    }, 0)
}

export function normalizePlayerName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
}

function rosterNameSet(playersByTeam, teamId) {
  const list = playersByTeam?.[teamId] ?? playersByTeam?.[String(teamId)] ?? []
  return new Set((list || []).map((p) => normalizePlayerName(p?.player_name)))
}

/**
 * @param {object} params
 * @param {number|string} params.homeScore
 * @param {number|string} params.awayScore
 * @param {string} [params.homeTeamId]
 * @param {string} [params.awayTeamId]
 * @param {Array<{ goals?: number, team_id?: string }>} params.goals
 * @returns {{ ok: true } | { ok: false, message: string, code: string, affectedFields?: string[] }}
 */
export function validateMatchGoalsVsScore({
  homeScore,
  awayScore,
  homeTeamId,
  awayTeamId,
  goals,
}) {
  const h = Math.max(0, Math.floor(Number(homeScore)) || 0)
  const a = Math.max(0, Math.floor(Number(awayScore)) || 0)
  const expectedTotal = h + a
  const loaded = sumLoadedGoals(goals)

  if (loaded !== expectedTotal) {
    return {
      ok: false,
      message: MSG_GOALS_TOTAL_MISMATCH,
      code: 'GOALS_TOTAL_MISMATCH',
      affectedFields: ['goals'],
    }
  }

  if (homeTeamId && awayTeamId) {
    const homeLoaded = sumGoalsByTeam(goals, homeTeamId)
    const awayLoaded = sumGoalsByTeam(goals, awayTeamId)
    if (homeLoaded !== h || awayLoaded !== a) {
      return {
        ok: false,
        message: `Los goles por equipo no coinciden con el marcador: el resultado es ${h}–${a} y hay ${homeLoaded} gol(es) del local y ${awayLoaded} del visitante cargados en los eventos.`,
        code: 'GOALS_BY_TEAM_MISMATCH',
        affectedFields: ['goals'],
      }
    }
  }

  return { ok: true }
}

/**
 * Tarjetas: plantel del equipo y reglas imposibles (más de una roja al mismo jugador en el mismo partido).
 */
export function validateMatchCards({
  cards,
  playersByTeam,
  homeTeamId,
  awayTeamId,
}) {
  const allowedTeams = new Set([String(homeTeamId), String(awayTeamId)].filter(Boolean))
  const redCountByPlayer = new Map()

  for (const c of cards || []) {
    const tid = c?.team_id != null ? String(c.team_id) : ''
    if (allowedTeams.size > 0 && tid && !allowedTeams.has(tid)) {
      return {
        ok: false,
        message: 'Hay una tarjeta asignada a un equipo que no participa en este partido.',
        code: 'CARD_TEAM_INVALID',
        affectedFields: ['cards'],
      }
    }

    const roster = rosterNameSet(playersByTeam, c.team_id)
    if (roster.size > 0) {
      const name = normalizePlayerName(c.player_name)
      if (!name || !roster.has(name)) {
        return {
          ok: false,
          message: `La tarjeta de «${String(c.player_name || '').trim() || '…'}» no corresponde a un jugador del plantel de ese equipo en este torneo.`,
          code: 'CARD_PLAYER_NOT_IN_ROSTER',
          affectedFields: ['cards'],
        }
      }
    }

    if (c.card_type === 'red') {
      const key = `${normalizePlayerName(c.player_name)}::${tid}`
      const n = (redCountByPlayer.get(key) || 0) + 1
      redCountByPlayer.set(key, n)
      if (n > 1) {
        return {
          ok: false,
          message: `No puede haber más de una tarjeta roja para el mismo jugador en el mismo partido (${String(c.player_name || '').trim() || 'jugador'}).`,
          code: 'CARD_DUPLICATE_RED',
          affectedFields: ['cards'],
        }
      }
    }
  }

  return { ok: true }
}

/**
 * Valida un alta de gol: no superar el total del marcador cuando el partido ya tiene resultado.
 */
export function validateGoalAddition({
  homeScore,
  awayScore,
  currentGoals,
  additionalGoals,
  homeTeamId,
  awayTeamId,
  goalTeamId,
}) {
  const add = Math.max(1, Math.floor(Number(additionalGoals)) || 1)
  const nextGoals = [...(currentGoals || []), { team_id: goalTeamId, goals: add }]
  return validateMatchGoalsVsScore({
    homeScore,
    awayScore,
    homeTeamId,
    awayTeamId,
    goals: nextGoals,
  })
}

/**
 * Valida un alta de tarjeta antes de persistir (jugador en plantel + sin segunda roja).
 */
export function validateCardAddition({
  cards,
  playersByTeam,
  homeTeamId,
  awayTeamId,
  newCard,
}) {
  const next = [...(cards || []), newCard]
  return validateMatchCards({
    cards: next,
    playersByTeam,
    homeTeamId,
    awayTeamId,
  })
}

/**
 * Resultado único para la UI: lista de fallos (puede haber varios tipos).
 */
export function validateLeagueMatchEvents({
  homeScore,
  awayScore,
  homeTeamId,
  awayTeamId,
  goals,
  cards,
  playersByTeam,
}) {
  const g = validateMatchGoalsVsScore({
    homeScore,
    awayScore,
    homeTeamId,
    awayTeamId,
    goals,
  })
  if (!g.ok) return g

  const c = validateMatchCards({
    cards,
    playersByTeam,
    homeTeamId,
    awayTeamId,
  })
  if (!c.ok) return c

  return { ok: true }
}
