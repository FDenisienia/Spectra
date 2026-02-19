import mysql from 'mysql2/promise'
import { createSchema } from './schema.js'

// Acepta MYSQL_*, MYSQL* (Railway) y DB_* (Railway con referencias)
const host = process.env.MYSQL_HOST || process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1'
const port = Number(process.env.MYSQL_PORT || process.env.MYSQLPORT || process.env.DB_PORT) || 3306
const user = process.env.MYSQL_USER || process.env.MYSQLUSER || process.env.DB_USER || 'root'
const password = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || ''
const dbName = process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || process.env.DB_NAME || 'spectra'

async function ensureDatabase() {
  const conn = await mysql.createConnection({ host, port, user, password })
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await conn.end()
}

const pool = mysql.createPool({
  host,
  port,
  user,
  password,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
})

/** Asegura que la base existe y el esquema (tablas e índices). */
let schemaInitialized = false
export async function ensureSchema() {
  if (schemaInitialized) return
  await ensureDatabase()
  await createSchema(pool)
  schemaInitialized = true
}

export { pool }
