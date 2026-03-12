import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Spinner, Alert } from 'react-bootstrap'
import * as api from '../api/tournament'
import Tournament from '../pages/Tournament'
import LeagueView from '../pages/LeagueView'
import TournamentBackground from './tournament/TournamentBackground'

/**
 * Carga el torneo y muestra la vista según deporte: pádel (Tournament) o liga (LeagueView).
 * isAdmin = false: vista pública solo lectura.
 */
export default function TournamentRouter({ isAdmin = false }) {
  const { id, teamId } = useParams()
  const navigate = useNavigate()
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    api.getTournament(id)
      .then((t) => {
        setTournament(t)
        setError(null)
      })
      .catch((e) => {
        setError(e.message)
        setTournament(null)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (!id) {
    navigate('/', { replace: true })
    return null
  }
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" />
      </div>
    )
  }
  if (error || !tournament) {
    return (
      <div className="container py-5">
        <Alert variant="danger">{error || 'Torneo no encontrado'}</Alert>
        <a href="/">Volver al inicio</a>
      </div>
    )
  }

  const themeSuffix = tournament.sport === 'futbol' && tournament.gender === 'mixto' ? 'futbol-mixto'
    : tournament.sport === 'futbol' && tournament.gender === 'masculino' ? 'futbol-masculino'
    : tournament.sport
  const themeClass = `tournament-view theme-${themeSuffix}`

  const useLeagueFormat = tournament.sport === 'futbol' || tournament.sport === 'hockey' ||
    (tournament.sport === 'padel' && (tournament.modality === 'grupo' || tournament.modality === 'liga'))
  if (useLeagueFormat) {
    return (
      <div className={themeClass}>
        {!isAdmin && <TournamentBackground sport={tournament.sport || 'padel'} gender={tournament.gender} />}
        <div className="tournament-content">
          <LeagueView tournamentId={id} tournament={tournament} teamId={teamId} />
        </div>
      </div>
    )
  }

  return (
    <div className={themeClass}>
      {!isAdmin && <TournamentBackground sport={tournament.sport || 'padel'} gender={tournament.gender} />}
      <div className="tournament-content">
        <Tournament isAdmin={isAdmin} tournament={tournament} />
      </div>
    </div>
  )
}
