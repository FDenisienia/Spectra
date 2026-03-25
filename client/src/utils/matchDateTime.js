/** Convierte valor de BD a `YYYY-MM-DDTHH:mm` para input datetime-local. */
export function playedAtToDatetimeLocal(value) {
  if (value == null || value === '') return ''
  const s = String(value).trim()
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/)
  if (m) return `${m[1]}T${m[2]}:${m[3]}`
  return ''
}

/**
 * Fechas de partidos se guardan como hora local Argentina (sin zona en BD).
 * Formatea para mostrar siempre en America/Argentina/Buenos_Aires.
 */
export function formatMatchDateTimeArgentina(value) {
  if (value == null || value === '') return '—'
  const s = String(value).trim()

  // MySQL DATETIME como string (dateStrings: true): "2026-03-24 19:00:00"
  const sqlNaive = s.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/)
  if (sqlNaive) {
    const d = new Date(`${sqlNaive[1]}T${sqlNaive[2]}-03:00`)
    return d.toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  // ISO sin Z ni offset (naive): tratar como hora Argentina
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) && !s.includes('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
    const base = s.slice(0, 19)
    const d = new Date(`${base}-03:00`)
    return d.toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
