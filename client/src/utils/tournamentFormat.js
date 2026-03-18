/**
 * Indica si el torneo usa formato de liga (grupos/zones, equipos, jornadas).
 * Coincide con la lógica del servidor (isLeagueTournament).
 */
export function isLeagueFormat(tournament) {
  if (!tournament) return false
  if (tournament.sport === 'futbol' || tournament.sport === 'hockey') return true
  if (tournament.sport === 'padel' && (tournament.modality === 'grupo' || tournament.modality === 'liga')) return true
  return false
}
