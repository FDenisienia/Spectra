/**
 * Temas visuales por deporte (y gender para futbol).
 * Paleta: padel #1d82bd/#166399 | hockey #3f6fd5/#2d5bc4 | futbol #650857/#ee2a7b | futbol_mixto verde/amarillo
 */

/**
 * objectPosition: coloca el elemento principal en esquina (arriba izq/der).
 * Valores bajos (15-25%) = arriba-izquierda, altos (75-85%) = arriba-derecha.
 * Evita centrado automático; prioriza que el objeto no quede cortado.
 */
export const TOURNAMENT_THEMES = {
  padel: {
    bgImage: '/images/padel-bg.png?v=2',
    overlayGradient: 'linear-gradient(160deg, rgba(29, 130, 189, 0.38) 0%, rgba(22, 99, 153, 0.48) 100%)',
    objectPosition: '25% 72%',
  },
  hockey: {
    bgImage: '/images/hockey-bg.png?v=2',
    overlayGradient: 'linear-gradient(160deg, rgba(63, 111, 213, 0.35) 0%, rgba(45, 91, 196, 0.45) 100%)',
    objectPosition: '22% 82%',
  },
  futbol: {
    bgImage: '/images/futbol-bg.png?v=4',
    overlayGradient: 'linear-gradient(160deg, rgba(101, 8, 87, 0.18) 0%, rgba(238, 42, 123, 0.15) 100%)',
    objectPosition: '50% 50%',
  },
  futbol_mixto: {
    bgImage: '/images/futbol-bg.png?v=4',
    overlayGradient: 'linear-gradient(160deg, rgba(31, 107, 56, 0.2) 0%, rgba(56, 167, 82, 0.18) 100%)',
    objectPosition: '50% 50%',
  },
  futbol_masculino: {
    bgImage: '/images/futbol-bg.png?v=4',
    overlayGradient: 'linear-gradient(160deg, rgba(26, 77, 140, 0.2) 0%, rgba(59, 130, 246, 0.18) 100%)',
    objectPosition: '50% 50%',
  },
}

export function getTheme(sport, gender) {
  if (sport === 'futbol' && gender === 'mixto') return TOURNAMENT_THEMES.futbol_mixto
  if (sport === 'futbol' && gender === 'masculino') return TOURNAMENT_THEMES.futbol_masculino
  return TOURNAMENT_THEMES[sport] || TOURNAMENT_THEMES.padel
}
