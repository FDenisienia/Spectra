/**
 * Normaliza fecha/hora del admin (datetime-local o similar) a DATETIME MySQL
 * sin conversión a UTC: el valor es la hora "reloj" del partido en Argentina.
 */
export function normalizePlayedAtForDb(value) {
  if (value == null || value === '') return null
  const s = String(value).trim()
  const m = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?/)
  if (m) {
    const sec = (m[3] || '00').padStart(2, '0')
    return `${m[1]} ${m[2]}:${sec}`
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return s
  return s
}
