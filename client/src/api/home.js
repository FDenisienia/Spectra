const BASE = import.meta.env.VITE_API_URL || '/api'
import { authHeaders } from './auth.js'

function jsonHeaders() {
  return { 'Content-Type': 'application/json', ...authHeaders() }
}

async function parseError(res) {
  const text = await res.text()
  try {
    const data = JSON.parse(text)
    return data.error || res.statusText
  } catch {
    return text || res.statusText
  }
}

/** Obtiene todo el contenido de la home (hero, galería, sponsors). */
export async function getHomeContent() {
  const res = await fetch(`${BASE}/home`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Actualiza el hero (título y descripción). */
export async function updateHeroContent({ heroTitle, heroDescription }) {
  const res = await fetch(`${BASE}/home/hero`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ heroTitle, heroDescription }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Lista imágenes de la galería. */
export async function getGalleryImages() {
  const res = await fetch(`${BASE}/home/gallery`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Agrega una imagen a la galería. */
export async function createGalleryImage({ url, alt, sortOrder }) {
  const res = await fetch(`${BASE}/home/gallery`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ url, alt, sortOrder }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Actualiza una imagen de la galería. */
export async function updateGalleryImage(id, { url, alt, sortOrder }) {
  const res = await fetch(`${BASE}/home/gallery/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ url, alt, sortOrder }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Elimina una imagen de la galería. */
export async function deleteGalleryImage(id) {
  const res = await fetch(`${BASE}/home/gallery/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok && res.status !== 204) throw new Error(await parseError(res))
}

/** Reordena imágenes de la galería. */
export async function reorderGallery(ids) {
  const res = await fetch(`${BASE}/home/gallery/reorder`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Lista sponsors. */
export async function getSponsors() {
  const res = await fetch(`${BASE}/home/sponsors`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Crea un sponsor. */
export async function createSponsor({ name, logoUrl, link, sortOrder }) {
  const res = await fetch(`${BASE}/home/sponsors`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ name, logoUrl, link, sortOrder }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Actualiza un sponsor. */
export async function updateSponsor(id, { name, logoUrl, link, sortOrder }) {
  const res = await fetch(`${BASE}/home/sponsors/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify({ name, logoUrl, link, sortOrder }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** Elimina un sponsor. */
export async function deleteSponsor(id) {
  const res = await fetch(`${BASE}/home/sponsors/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok && res.status !== 204) throw new Error(await parseError(res))
}

/** Reordena sponsors. */
export async function reorderSponsors(ids) {
  const res = await fetch(`${BASE}/home/sponsors/reorder`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}
