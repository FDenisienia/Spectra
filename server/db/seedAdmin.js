import bcrypt from 'bcryptjs'
import { pool } from './index.js'

const DEFAULT_USER = 'spectra_admin'
const DEFAULT_PASSWORD = 'admin123'

/**
 * Asegura que existe un único usuario administrador.
 * Usa ADMIN_USERNAME y ADMIN_PASSWORD si están definidos; si no, crea/actualiza con valores por defecto.
 */
export async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || DEFAULT_USER
  const password = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD
  const hash = await bcrypt.hash(password, 10)
  const [rows] = await pool.query('SELECT id FROM admin_user LIMIT 1')
  if (rows.length === 0) {
    await pool.query(
      'INSERT INTO admin_user (username, password_hash) VALUES (?, ?)',
      [username, hash]
    )
    console.log('[Spectra] Admin creado (username:', username, ')')
  } else {
    await pool.query('UPDATE admin_user SET password_hash = ? WHERE id = ?', [hash, rows[0].id])
    console.log('[Spectra] Admin actualizado (username:', username, ')')
  }
}
