/**
 * Crea/actualiza el usuario admin (spectra_admin / admin123).
 * Uso (desde directorio server/): node seed-admin.js
 * En Railway (SSH): node seed-admin.js
 */
import './loadEnv.js'
import { ensureSchema } from './db/index.js'
import { seedAdmin } from './db/seedAdmin.js'

ensureSchema()
  .then(() => seedAdmin())
  .then(() => {
    console.log('Admin listo.')
    process.exit(0)
  })
  .catch((e) => {
    console.error('Error:', e.message)
    process.exit(1)
  })
