import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { pool } from './db/index.js'

const JWT_SECRET = process.env.JWT_SECRET || 'spectra-secret-cambiar-en-produccion'
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d'

/**
 * Verifica usuario y contraseña; devuelve token JWT.
 * @returns {{ token: string, username: string }}
 */
export async function login(username, password) {
  const [rows] = await pool.query(
    'SELECT id, username, password_hash FROM admin_user WHERE username = ? LIMIT 1',
    [username]
  )
  if (rows.length === 0) throw new Error('Usuario o contraseña incorrectos')
  const user = rows[0]
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) throw new Error('Usuario o contraseña incorrectos')
  const token = jwt.sign(
    { sub: String(user.id), username: user.username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  )
  return { token, username: user.username }
}

/**
 * Middleware: exige Authorization: Bearer <token>. Pone req.auth = payload.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.auth = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada' })
  }
}

/**
 * Cambia la contraseña del admin autenticado.
 * @param {number} userId - ID del admin
 * @param {string} currentPassword - contraseña actual
 * @param {string} newPassword - nueva contraseña
 */
export async function changePassword(userId, currentPassword, newPassword) {
  const [rows] = await pool.query(
    'SELECT password_hash FROM admin_user WHERE id = ? LIMIT 1',
    [userId]
  )
  if (rows.length === 0) throw new Error('Usuario no encontrado')
  const ok = await bcrypt.compare(currentPassword, rows[0].password_hash)
  if (!ok) throw new Error('Contraseña actual incorrecta')
  if (!newPassword || newPassword.length < 6) {
    throw new Error('La nueva contraseña debe tener al menos 6 caracteres')
  }
  const hash = await bcrypt.hash(newPassword, 10)
  await pool.query('UPDATE admin_user SET password_hash = ? WHERE id = ?', [hash, userId])
}

/**
 * Opcional: si hay token válido, pone req.auth; si no, sigue sin él.
 */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return next()
  const token = header.slice(7)
  try {
    req.auth = jwt.verify(token, JWT_SECRET)
  } catch {
    // ignore
  }
  next()
}
