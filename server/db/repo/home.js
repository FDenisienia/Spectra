/**
 * Repositorio para contenido de la home: hero, galería, sponsors.
 */
import { pool } from '../index.js'
import { randomUUID } from 'crypto'

const DEFAULT_HERO_TITLE = 'Espectra Producciones'
const DEFAULT_HERO_DESCRIPTION =
  'Espectra Producciones es la organización encargada de gestionar y organizar torneos y eventos deportivos. Con experiencia en distintas disciplinas —fútbol, hockey, pádel y más—, nos dedicamos a crear experiencias competitivas de calidad, con profesionalismo y pasión por el deporte.'

/** Obtiene el contenido del hero (título y descripción). */
export async function getHeroContent() {
  const [rows] = await pool.query(
    'SELECT `key`, value FROM home_content WHERE `key` IN (?, ?)',
    ['hero_title', 'hero_description']
  )
  const map = Object.fromEntries((rows || []).map((r) => [r.key, r.value]))
  return {
    heroTitle: map.hero_title ?? DEFAULT_HERO_TITLE,
    heroDescription: map.hero_description ?? DEFAULT_HERO_DESCRIPTION,
  }
}

/** Actualiza el contenido del hero. */
export async function updateHeroContent({ heroTitle, heroDescription }) {
  const conn = await pool.getConnection()
  try {
    if (heroTitle != null) {
      await conn.query(
        'INSERT INTO home_content (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        ['hero_title', String(heroTitle)]
      )
    }
    if (heroDescription != null) {
      await conn.query(
        'INSERT INTO home_content (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        ['hero_description', String(heroDescription)]
      )
    }
    return getHeroContent()
  } finally {
    conn.release()
  }
}

/** Lista imágenes de la galería ordenadas. */
export async function getGalleryImages() {
  const [rows] = await pool.query(
    'SELECT id, url, alt, sort_order, created_at FROM home_gallery ORDER BY sort_order ASC, created_at ASC'
  )
  return (rows || []).map((r) => ({
    id: r.id,
    url: r.url,
    alt: r.alt || '',
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }))
}

/** Crea una imagen en la galería. */
export async function createGalleryImage({ url, alt, sortOrder }) {
  const id = randomUUID().slice(0, 20).replace(/-/g, '')
  const so = sortOrder ?? 0
  await pool.query(
    'INSERT INTO home_gallery (id, url, alt, sort_order) VALUES (?, ?, ?, ?)',
    [id, String(url || ''), alt ? String(alt) : null, so]
  )
  const [rows] = await pool.query(
    'SELECT id, url, alt, sort_order, created_at FROM home_gallery WHERE id = ?',
    [id]
  )
  const r = rows[0]
  return {
    id: r.id,
    url: r.url,
    alt: r.alt || '',
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }
}

/** Actualiza una imagen de la galería. */
export async function updateGalleryImage(id, { url, alt, sortOrder }) {
  const updates = []
  const params = []
  if (url !== undefined) {
    updates.push('url = ?')
    params.push(String(url))
  }
  if (alt !== undefined) {
    updates.push('alt = ?')
    params.push(alt ? String(alt) : null)
  }
  if (sortOrder !== undefined) {
    updates.push('sort_order = ?')
    params.push(Number(sortOrder))
  }
  if (updates.length === 0) return getGalleryImages().then((list) => list.find((x) => x.id === id))
  params.push(id)
  const [result] = await pool.query(
    `UPDATE home_gallery SET ${updates.join(', ')} WHERE id = ?`,
    params
  )
  if (result.affectedRows === 0) return null
  const [rows] = await pool.query(
    'SELECT id, url, alt, sort_order, created_at FROM home_gallery WHERE id = ?',
    [id]
  )
  const r = rows[0]
  return {
    id: r.id,
    url: r.url,
    alt: r.alt || '',
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }
}

/** Elimina una imagen de la galería. */
export async function deleteGalleryImage(id) {
  const [result] = await pool.query('DELETE FROM home_gallery WHERE id = ?', [id])
  return result.affectedRows > 0
}

/** Reordena imágenes de la galería. */
export async function reorderGallery(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return getGalleryImages()
  const conn = await pool.getConnection()
  try {
    for (let i = 0; i < ids.length; i++) {
      await conn.query('UPDATE home_gallery SET sort_order = ? WHERE id = ?', [i, ids[i]])
    }
    return getGalleryImages()
  } finally {
    conn.release()
  }
}

/** Lista sponsors ordenados. */
export async function getSponsors() {
  const [rows] = await pool.query(
    'SELECT id, name, logo_url, link, sort_order, created_at FROM home_sponsors ORDER BY sort_order ASC, created_at ASC'
  )
  return (rows || []).map((r) => ({
    id: r.id,
    name: r.name,
    logoUrl: r.logo_url || null,
    link: r.link || null,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }))
}

/** Crea un sponsor. */
export async function createSponsor({ name, logoUrl, link, sortOrder }) {
  const id = randomUUID().slice(0, 20).replace(/-/g, '')
  const so = sortOrder ?? 0
  await pool.query(
    'INSERT INTO home_sponsors (id, name, logo_url, link, sort_order) VALUES (?, ?, ?, ?, ?)',
    [id, String(name || ''), logoUrl ? String(logoUrl) : null, link ? String(link) : null, so]
  )
  const [rows] = await pool.query(
    'SELECT id, name, logo_url, link, sort_order, created_at FROM home_sponsors WHERE id = ?',
    [id]
  )
  const r = rows[0]
  return {
    id: r.id,
    name: r.name,
    logoUrl: r.logo_url || null,
    link: r.link || null,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }
}

/** Actualiza un sponsor. */
export async function updateSponsor(id, { name, logoUrl, link, sortOrder }) {
  const updates = []
  const params = []
  if (name !== undefined) {
    updates.push('name = ?')
    params.push(String(name))
  }
  if (logoUrl !== undefined) {
    updates.push('logo_url = ?')
    params.push(logoUrl ? String(logoUrl) : null)
  }
  if (link !== undefined) {
    updates.push('link = ?')
    params.push(link ? String(link) : null)
  }
  if (sortOrder !== undefined) {
    updates.push('sort_order = ?')
    params.push(Number(sortOrder))
  }
  if (updates.length === 0) return getSponsors().then((list) => list.find((x) => x.id === id))
  params.push(id)
  const [result] = await pool.query(
    `UPDATE home_sponsors SET ${updates.join(', ')} WHERE id = ?`,
    params
  )
  if (result.affectedRows === 0) return null
  const [rows] = await pool.query(
    'SELECT id, name, logo_url, link, sort_order, created_at FROM home_sponsors WHERE id = ?',
    [id]
  )
  const r = rows[0]
  return {
    id: r.id,
    name: r.name,
    logoUrl: r.logo_url || null,
    link: r.link || null,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }
}

/** Elimina un sponsor. */
export async function deleteSponsor(id) {
  const [result] = await pool.query('DELETE FROM home_sponsors WHERE id = ?', [id])
  return result.affectedRows > 0
}

/** Reordena sponsors. */
export async function reorderSponsors(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return getSponsors()
  const conn = await pool.getConnection()
  try {
    for (let i = 0; i < ids.length; i++) {
      await conn.query('UPDATE home_sponsors SET sort_order = ? WHERE id = ?', [i, ids[i]])
    }
    return getSponsors()
  } finally {
    conn.release()
  }
}
