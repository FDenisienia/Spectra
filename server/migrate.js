/**
 * Ejecuta la migración (crea base y tablas).
 * Uso (desde directorio server/): node migrate.js
 * En Railway (SSH): node migrate.js
 */
import './loadEnv.js'
import { ensureSchema } from './db/index.js'

ensureSchema()
  .then(() => {
    console.log('Tablas creadas correctamente.')
    process.exit(0)
  })
  .catch((e) => {
    console.error('Error:', e.message)
    process.exit(1)
  })
