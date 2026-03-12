/**
 * Reglas disciplinarias por deporte.
 * Centraliza la lógica de acumulación de tarjetas y suspensiones.
 */

/** Configuración por deporte: umbrales de acumulación y sanción por roja directa. */
export const DISCIPLINE_RULES = {
  futbol: {
    /** 3 amarillas = 1 fecha de suspensión automática */
    yellow_threshold: 3,
    /** No existe tarjeta verde en fútbol */
    has_green: false,
    green_threshold: null,
    /** Roja directa: sanción manual de 1 a 3 fechas */
    red_direct_dates: [1, 2, 3],
  },
  hockey: {
    /** 2 amarillas = 1 fecha de suspensión automática */
    yellow_threshold: 2,
    /** 3 verdes = 1 fecha de suspensión automática */
    has_green: true,
    green_threshold: 3,
    /** Roja directa: sanción manual de 1 a 3 fechas */
    red_direct_dates: [1, 2, 3],
  },
}

/** Razones de suspensión en BD */
export const SUSPENSION_REASONS = {
  YELLOW_ACCUMULATION: 'yellow_accumulation',
  GREEN_ACCUMULATION: 'green_accumulation',
  RED_DIRECT: 'red_direct',
}

/**
 * Obtiene las reglas disciplinarias para un deporte.
 * @param {string} sport - 'futbol' | 'hockey'
 * @returns {object} Reglas o defaults de fútbol si deporte no tiene reglas propias
 */
export function getDisciplineRules(sport) {
  return DISCIPLINE_RULES[sport] ?? DISCIPLINE_RULES.futbol
}

/**
 * Indica si el deporte usa tarjeta verde.
 */
export function hasGreenCard(sport) {
  return getDisciplineRules(sport).has_green === true
}

/**
 * Obtiene el umbral de amarillas para suspensión automática.
 */
export function getYellowThreshold(sport) {
  return getDisciplineRules(sport).yellow_threshold ?? 3
}

/**
 * Obtiene el umbral de verdes para suspensión automática (null si no aplica).
 */
export function getGreenThreshold(sport) {
  const rules = getDisciplineRules(sport)
  return rules.has_green ? rules.green_threshold : null
}

/**
 * Devuelve la etiqueta legible para un reason de suspensión.
 */
export function getReasonLabel(reason) {
  const labels = {
    [SUSPENSION_REASONS.YELLOW_ACCUMULATION]: 'Acumulación de amarillas',
    [SUSPENSION_REASONS.GREEN_ACCUMULATION]: 'Acumulación de verdes',
    [SUSPENSION_REASONS.RED_DIRECT]: 'Tarjeta roja directa',
  }
  return labels[reason] ?? reason
}
