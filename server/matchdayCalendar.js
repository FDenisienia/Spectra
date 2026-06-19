const ARG_TZ = 'America/Argentina/Buenos_Aires'

/** Fecha de hoy en Argentina como YYYY-MM-DD. */
export function getTodayInArgentina(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARG_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  return `${y}-${m}-${d}`
}

/** Extrae YYYY-MM-DD de un DATETIME MySQL (hora local Argentina). */
export function calendarDateFromPlayedAt(playedAt) {
  if (playedAt == null || playedAt === '') return null
  const s = String(playedAt).trim()
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

function addDaysToDateStr(dateStr, days) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, mo - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

/**
 * Fecha de calendario de una jornada: MIN(played_at) de sus partidos,
 * o start_date + (number - 1) semanas si no hay fechas cargadas.
 */
export function resolveMatchdayScheduledDate({ number, scheduled_date, start_date }) {
  if (scheduled_date) return scheduled_date
  if (start_date && number >= 1) {
    return addDaysToDateStr(String(start_date).slice(0, 10), (number - 1) * 7)
  }
  return null
}

/**
 * Determina la jornada actual según el calendario programado.
 *
 * - Torneo finalizado → última jornada por número.
 * - Jornada vigente → la de mayor número cuya fecha programada <= hoy.
 * - Sin jornadas pasadas → la primera jornada (calendario futuro o sin fechas).
 */
export function resolveCurrentMatchday(matchdays, { today, tournamentStatus } = {}) {
  if (!matchdays?.length) return null

  const sorted = [...matchdays].sort((a, b) => a.number - b.number)
  const todayStr = today ?? getTodayInArgentina()

  if (tournamentStatus === 'finished') {
    return sorted[sorted.length - 1]
  }

  const withDates = sorted.map((md) => ({
    ...md,
    calendarDate: resolveMatchdayScheduledDate(md),
  }))

  const elapsed = withDates.filter((md) => md.calendarDate && md.calendarDate <= todayStr)
  if (elapsed.length > 0) {
    return elapsed[elapsed.length - 1]
  }

  const upcoming = withDates.find((md) => md.calendarDate && md.calendarDate > todayStr)
  if (upcoming) return upcoming

  return sorted[0]
}
