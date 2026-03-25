/** URL absoluta para abrir el PDF del reglamento (mismo origen con proxy, o API en producción). */
export function reglamentoPublicHref(reglamento_url) {
  if (!reglamento_url) return ''
  if (reglamento_url.startsWith('http://') || reglamento_url.startsWith('https://')) return reglamento_url
  const base = import.meta.env.VITE_API_URL || ''
  if (base) {
    const origin = base.replace(/\/api\/?$/, '')
    const path = reglamento_url.startsWith('/') ? reglamento_url : `/${reglamento_url}`
    return `${origin}${path}`
  }
  const path = reglamento_url.startsWith('/') ? reglamento_url : `/${reglamento_url}`
  return `${window.location.origin}${path}`
}
