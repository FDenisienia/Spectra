import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const REGLAMENTO_MAX_BYTES = 5 * 1024 * 1024
const SUBDIR = 'reglamentos'

/** Directorio absoluto donde se guardan los PDF (servido como estático bajo /api/uploads/reglamentos). */
export function getReglamentosDir() {
  return path.join(__dirname, 'uploads', SUBDIR)
}

export async function ensureReglamentosDir() {
  const dir = getReglamentosDir()
  await fs.mkdir(dir, { recursive: true })
}

/** Ruta pública relativa al mismo origen del API (compatible con proxy /api). */
export function publicReglamentoPath(tournamentId) {
  return `/api/uploads/${SUBDIR}/${encodeURIComponent(tournamentId)}.pdf`
}

export async function validatePdfFile(filePath) {
  const fh = await fs.open(filePath, 'r')
  try {
    const buf = Buffer.alloc(5)
    await fh.read(buf, 0, 5, 0)
    const head = buf.toString('utf8')
    if (!head.startsWith('%PDF')) {
      throw new Error('El archivo no es un PDF válido')
    }
  } finally {
    await fh.close()
  }
}

export async function removeReglamentoFile(tournamentId) {
  const p = path.join(getReglamentosDir(), `${tournamentId}.pdf`)
  try {
    await fs.unlink(p)
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }
}

export async function unlinkSilent(filePath) {
  try {
    await fs.unlink(filePath)
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }
}

/**
 * Multer para un único campo "reglamento" (opcional en creación/edición).
 * El nombre del archivo en disco es `{tournamentId}.pdf`; el id se asigna en req._pendingTournamentId o req.params.id.
 */
export function createReglamentoUploader(getTournamentId) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, getReglamentosDir())
      },
      filename: (req, _file, cb) => {
        const id = typeof getTournamentId === 'function' ? getTournamentId(req) : getTournamentId
        cb(null, `${id}.pdf`)
      },
    }),
    limits: { fileSize: REGLAMENTO_MAX_BYTES },
    fileFilter: (_req, file, cb) => {
      const ok =
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/x-pdf' ||
        (file.originalname && file.originalname.toLowerCase().endsWith('.pdf'))
      if (!ok) {
        return cb(new Error('Solo se permiten archivos PDF'))
      }
      cb(null, true)
    },
  })
}
