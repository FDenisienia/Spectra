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

/** Imágenes por deporte. Filtrar por deporte para cada galería. */
export const GALLERY_IMAGES = [
  // Hockey - Entre Amigas
  { id: 'eah-113', deporte: 'hockey', torneoId: 'entre-amigas', src: '/images/gallery/EAHockey-113.png', alt: 'Entre Amigas Hockey - jugadora conduciendo la bocha' },
  { id: 'eah-89', deporte: 'hockey', torneoId: 'entre-amigas', src: '/images/gallery/EAHockey-89.png', alt: 'Entre Amigas Hockey - jugadora en estocada' },
  { id: 'eah-72', deporte: 'hockey', torneoId: 'entre-amigas', src: '/images/gallery/EAHockey-72.png', alt: 'Entre Amigas Hockey - acción en la cancha' },
  { id: 'eah-58', deporte: 'hockey', torneoId: 'entre-amigas', src: '/images/gallery/EAHockey-58.png', alt: 'Entre Amigas Hockey - jugada nocturna' },
  { id: 'eah-47', deporte: 'hockey', torneoId: 'entre-amigas', src: '/images/gallery/EAHockey-47.png', alt: 'Entre Amigas Hockey - jugadora en posición' },
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
