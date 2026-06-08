/**
 * Escudo/logo de equipo. Muestra imagen si existe; si no, inicial del nombre.
 */
export default function TeamShield({ url, name = '', size = 32, className = '' }) {
  const px = typeof size === 'number' ? `${size}px` : size
  const initial = String(name || '?').trim().charAt(0).toUpperCase() || '?'

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`league-team-shield ${className}`.trim()}
        style={{ width: px, height: px }}
      />
    )
  }

  return (
    <span
      className={`league-team-shield league-team-shield--placeholder ${className}`.trim()}
      style={{ width: px, height: px, fontSize: Math.max(11, Math.round(Number.parseInt(px, 10) * 0.42) || 14) }}
      aria-hidden
    >
      {initial}
    </span>
  )
}
