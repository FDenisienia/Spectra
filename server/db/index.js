import mysql from 'mysql2/promise'
import { createSchema } from './schema.js'

const dbName = process.env.MYSQL_DATABASE || 'spectra'

async function ensureDatabase() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
  })
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await conn.end()
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
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
