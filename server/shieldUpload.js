import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import { unlinkSilent } from './reglamentoUpload.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const SHIELD_MAX_BYTES = 2 * 1024 * 1024
const SUBDIR = 'shields'
const ALLOWED_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

export function getShieldsDir() {
  return path.join(__dirname, 'uploads', SUBDIR)
}

export async function ensureShieldsDir() {
  await fs.mkdir(getShieldsDir(), { recursive: true })
}

export function publicShieldPath(teamId, ext) {
  const safeExt = ALLOWED_EXTS.includes(ext.toLowerCase()) ? ext.toLowerCase() : '.png'
  return `/api/uploads/${SUBDIR}/${encodeURIComponent(teamId)}${safeExt}`
}

function extFromFile(file) {
  const name = (file.originalname || '').toLowerCase()
  for (const ext of ALLOWED_EXTS) {
    if (name.endsWith(ext)) return ext === '.jpeg' ? '.jpg' : ext
  }
  const map = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
  }
  return map[file.mimetype] || '.png'
}

export async function validateImageFile(filePath) {
  const fh = await fs.open(filePath, 'r')
  try {
    const buf = Buffer.alloc(12)
    await fh.read(buf, 0, 12, 0)
    const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
    const gif = buf.toString('ascii', 0, 3) === 'GIF'
    const webp = buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP'
    if (!png && !jpeg && !gif && !webp) {
      throw new Error('El archivo no es una imagen válida (PNG, JPG, WebP o GIF)')
    }
  } finally {
    await fh.close()
  }
}

export async function removeShieldFiles(teamId) {
  const dir = getShieldsDir()
  for (const ext of ALLOWED_EXTS) {
    await unlinkSilent(path.join(dir, `${teamId}${ext === '.jpeg' ? '.jpg' : ext}`))
    if (ext === '.jpg') await unlinkSilent(path.join(dir, `${teamId}.jpeg`))
  }
}

export async function removeOtherShieldExtensions(teamId, keepExt) {
  const normalized = keepExt === '.jpeg' ? '.jpg' : keepExt
  for (const ext of ALLOWED_EXTS) {
    const e = ext === '.jpeg' ? '.jpg' : ext
    if (e !== normalized) {
      await unlinkSilent(path.join(getShieldsDir(), `${teamId}${e}`))
      if (ext === '.jpg') await unlinkSilent(path.join(getShieldsDir(), `${teamId}.jpeg`))
    }
  }
}

export function createShieldUploader(getTeamId) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, getShieldsDir())
      },
      filename: (req, file, cb) => {
        const id = typeof getTeamId === 'function' ? getTeamId(req) : getTeamId
        cb(null, `${id}${extFromFile(file)}`)
      },
    }),
    limits: { fileSize: SHIELD_MAX_BYTES },
    fileFilter: (_req, file, cb) => {
      const ok =
        file.mimetype.startsWith('image/') ||
        ALLOWED_EXTS.some((ext) => file.originalname?.toLowerCase().endsWith(ext))
      if (!ok) return cb(new Error('Solo se permiten imágenes PNG, JPG, WebP o GIF'))
      cb(null, true)
    },
  })
}
