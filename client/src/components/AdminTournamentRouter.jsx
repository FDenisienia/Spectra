import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Spinner, Alert } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import * as api from '../api/tournament'
import Tournament from '../pages/Tournament'
import LeagueAdmin from '../pages/LeagueAdmin'

/**
 * Carga el torneo y muestra la vista de administración según deporte:
 * pádel → Tournament con isAdmin; futbol/hockey → LeagueAdmin.
 */
export default function AdminTournamentRouter() {
  const { id } = useParams()
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
    navigate('/admin', { replace: true })
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
        <Link to="/admin">Volver al panel</Link>
      </div>
    )
  }

  const useLeagueFormat = tournament.sport === 'futbol' || tournament.sport === 'hockey' ||
    (tournament.sport === 'padel' && (tournament.modality === 'grupo' || tournament.modality === 'liga'))
  if (useLeagueFormat) {
    return <LeagueAdmin />
  }

  return <Tournament isAdmin={true} />
}
