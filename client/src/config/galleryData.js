/**
 * Configuración de galerías por deporte.
 * Estructura escalable: agregar deportes o imágenes aquí.
 *
 * Cada imagen: { id, src, alt, torneoId? }
 * deporte: 'hockey' | 'padel' | 'futbol'
 *
 * Las portadas usan las mismas imágenes de fondo que cada torneo (tournamentThemes).
 */

import { TOURNAMENT_THEMES } from './tournamentThemes'

const SPORTS_CONFIG = {
  hockey: {
    id: 'hockey',
    name: 'Hockey',
    coverAlt: 'Entre Amigas Hockey',
  },
  padel: {
    id: 'padel',
    name: 'Pádel',
    coverAlt: 'Smash Open Pádel',
  },
  futbol: {
    id: 'futbol',
    name: 'Fútbol',
    coverAlt: 'Estrellas del Fútbol',
  },
}

/** Portada = misma imagen que tiene cada torneo detrás del logo. */
const COVER_BY_SPORT = {
  hockey: '/images/hockey-logo-bg.png',
  padel: TOURNAMENT_THEMES.padel.bgImage,
  futbol: '/images/futbol-logo-bg.png',
}

export const SPORTS = Object.fromEntries(
  Object.entries(SPORTS_CONFIG).map(([key, config]) => [
    key,
    { ...config, coverImage: COVER_BY_SPORT[key] },
  ])
)

/**
 * Enlace a carpeta de Drive con más fotos (Momentos).
 * Opción A: en `client/.env` → `VITE_MOMENTOS_HOCKEY_DRIVE_URL=https://drive.google.com/...`
 * Opción B: pegá el enlace en MOMENTOS_HOCKEY_DRIVE_FALLBACK (abajo).
 * Si queda vacío, no se muestra «Ver más».
 */
const MOMENTOS_HOCKEY_DRIVE_FALLBACK =
  'https://drive.google.com/drive/folders/1E_XN8rH91GNTqiJD0zGw7sCpxmRvhWIz'

const moreHockeyUrl =
  (typeof import.meta !== 'undefined' &&
    import.meta.env?.VITE_MOMENTOS_HOCKEY_DRIVE_URL &&
    String(import.meta.env.VITE_MOMENTOS_HOCKEY_DRIVE_URL).trim()) ||
  String(MOMENTOS_HOCKEY_DRIVE_FALLBACK).trim()

export const GALLERY_MORE_PHOTOS_URL = {
  hockey: moreHockeyUrl,
  padel: '',
  futbol: '',
}

export function getMorePhotosUrl(deporte) {
  const url = GALLERY_MORE_PHOTOS_URL[deporte]
  return typeof url === 'string' && url.trim() ? url.trim() : null
}

/** Imágenes por deporte. Filtrar por deporte para cada galería. */
export const GALLERY_IMAGES = [
  // Hockey — Flor Ferrari
  { id: 'mom-hk-01', deporte: 'hockey', torneoId: 'entre-amigas', src: '/images/gallery/momentos-hockey/01.png', alt: 'Hockey — jugadora en la cancha' },
  { id: 'mom-hk-02', deporte: 'hockey', torneoId: 'entre-amigas', src: '/images/gallery/momentos-hockey/02.png', alt: 'Hockey — arquera con equipo de protección' },
  { id: 'mom-hk-03', deporte: 'hockey', torneoId: 'entre-amigas', src: '/images/gallery/momentos-hockey/03.png', alt: 'Hockey — jugada nocturna' },
  { id: 'mom-hk-04', deporte: 'hockey', torneoId: 'entre-amigas', src: '/images/gallery/momentos-hockey/04.png', alt: 'Hockey — celebración con trofeo' },
  { id: 'mom-hk-05', deporte: 'hockey', torneoId: 'entre-amigas', src: '/images/gallery/momentos-hockey/05.png', alt: 'Hockey — acción en el partido' },
  { id: 'mom-hk-06', deporte: 'hockey', torneoId: 'entre-amigas', src: '/images/gallery/momentos-hockey/06.png', alt: 'Hockey — equipo en la cancha' },
  { id: 'mom-hk-07', deporte: 'hockey', torneoId: 'entre-amigas', src: '/images/gallery/momentos-hockey/07.png', alt: 'Hockey — festejo del equipo' },
  { id: 'mom-hk-08', deporte: 'hockey', torneoId: 'entre-amigas', src: '/images/gallery/momentos-hockey/08.png', alt: 'Hockey — plantel posando' },
  { id: 'mom-hk-09', deporte: 'hockey', torneoId: 'entre-amigas', src: '/images/gallery/momentos-hockey/09.png', alt: 'Hockey — jugada cerca del arco' },
  { id: 'mom-hk-10', deporte: 'hockey', torneoId: 'entre-amigas', src: '/images/gallery/momentos-hockey/10.png', alt: 'Hockey — foto de equipo nocturna' },
  // Pádel - Smash Open
  { id: 'padel-1', deporte: 'padel', torneoId: 'smash-open', src: '/images/padel-bg.png', alt: 'Smash Open Pádel' },
  { id: 'padel-2', deporte: 'padel', torneoId: 'smash-open', src: '/images/smash-open-logo.png', alt: 'Smash Open' },
  // Fútbol - Estrellas del Fútbol
  { id: 'futbol-1', deporte: 'futbol', torneoId: 'estrellas-futbol', src: '/images/futbol-bg.png', alt: 'Estrellas del Fútbol' },
  { id: 'futbol-2', deporte: 'futbol', torneoId: 'estrellas-futbol', src: '/images/estrellas-futbol-mixto-logo.png', alt: 'Estrellas del Fútbol Mixto' },
]

export function getImagesBySport(deporte) {
  return GALLERY_IMAGES.filter((img) => img.deporte === deporte)
}
