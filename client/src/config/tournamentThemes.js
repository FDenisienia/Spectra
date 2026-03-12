/**
 * Temas visuales por deporte (y gender para futbol).
 * Paleta: padel #1d82bd/#166399 | hockey #3f6fd5/#2d5bc4 | futbol #650857/#ee2a7b | futbol_mixto verde/amarillo
 */

export const TOURNAMENT_THEMES = {
  padel: {
    bgImage: '/images/padel-bg.png',
    overlayGradient: 'linear-gradient(160deg, rgba(29, 130, 189, 0.38) 0%, rgba(22, 99, 153, 0.48) 100%)',
  },
  hockey: {
    bgImage: '/images/hockey-bg.png',
    overlayGradient: 'linear-gradient(160deg, rgba(63, 111, 213, 0.35) 0%, rgba(45, 91, 196, 0.45) 100%)',
  },
  futbol: {
    bgImage: '/images/futbol-bg.png',
    overlayGradient: 'linear-gradient(160deg, rgba(101, 8, 87, 0.4) 0%, rgba(238, 42, 123, 0.38) 100%)',
  },
  futbol_mixto: {
    bgImage: '/images/futbol-bg.png',
    overlayGradient: 'linear-gradient(160deg, rgba(31, 107, 56, 0.42) 0%, rgba(56, 167, 82, 0.38) 100%)',
  },
  futbol_masculino: {
    bgImage: '/images/futbol-bg.png',
    overlayGradient: 'linear-gradient(160deg, rgba(26, 77, 140, 0.42) 0%, rgba(59, 130, 246, 0.38) 100%)',
  },
}

export function getTheme(sport, gender) {
  if (sport === 'futbol' && gender === 'mixto') return TOURNAMENT_THEMES.futbol_mixto
  if (sport === 'futbol' && gender === 'masculino') return TOURNAMENT_THEMES.futbol_masculino
  return TOURNAMENT_THEMES[sport] || TOURNAMENT_THEMES.padel
}
