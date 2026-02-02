import { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Container, Navbar, Nav, Alert, Spinner, Form, Button } from 'react-bootstrap'
import * as api from '../api/tournament'
import TournamentConfig from '../components/tournament/TournamentConfig'
import TournamentPlayers from '../components/tournament/TournamentPlayers'
import RoundView from '../components/tournament/RoundView'

export default function Tournament() {
  const { id: tournamentId } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState(null)
  const [tournamentName, setTournamentName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [canCompleteDate, setCanCompleteDate] = useState(false)
  const [viewingDate, setViewingDate] = useState(1)

  const fetchState = useCallback(async () => {
    if (!tournamentId) return
    try {
      const data = await api.getState(tournamentId)
      setState(data)
      setError(null)
      if (data.status === 'date' || data.status === 'date_complete') {
        const can = await api.canCompleteDate(tournamentId)
        setCanCompleteDate(can)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    if (tournamentId) fetchState()
    else setLoading(false)
  }, [tournamentId, fetchState])

  useEffect(() => {
    if (!tournamentId || !state || state.status !== 'date' || !state.players?.length) return
    const dateData = state.dates?.[state.currentDate - 1]
    const needsMatches = !dateData || !dateData.matches || dateData.matches.length === 0
    if (needsMatches) {
      api.startDate(tournamentId)
        .then(({ state: nextState }) => {
          setState(nextState)
          api.canCompleteDate(tournamentId).then(setCanCompleteDate)
        })
        .catch((e) => setError(e?.message ?? String(e)))
    }
  }, [tournamentId, state?.status, state?.currentDate, state?.dates, state?.players?.length])

  const handleConfig = async (numCourts, numPlayers) => {
    setActionLoading(true)
    setError(null)
    try {
      await api.setConfig(tournamentId, numCourts, numPlayers)
      await fetchState()
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handlePlayers = async (names) => {
    setActionLoading(true)
    setError(null)
    try {
      await api.addPlayers(tournamentId, names)
      const { state: nextState } = await api.startDate(tournamentId)
      setState(nextState)
      const can = await api.canCompleteDate(tournamentId)
      setCanCompleteDate(can)
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteDate = async () => {
    setActionLoading(true)
    setError(null)
    try {
      await api.completeDate(tournamentId)
      await fetchState()
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleGenerateMatches = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const { state: nextState } = await api.startDate(tournamentId)
      setState(nextState)
      const can = await api.canCompleteDate(tournamentId)
      setCanCompleteDate(can)
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleNextDate = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const { state: nextState } = await api.startNextDate(tournamentId)
      if (nextState?.players && Array.isArray(nextState.players)) {
        nextState.players = nextState.players.filter((p) => p != null && p.id != null)
      }
      setState(nextState)
      const can = await api.canCompleteDate(tournamentId)
      setCanCompleteDate(can)
    } catch (e) {
      setError(e.message)
    } finally {
      setActionLoading(false)
    }
  }

  const currentDate = state?.currentDate ?? 1
  const datesCount = state?.dates?.length ?? 0

  // Mantener la fecha vista sincronizada con la actual al cargar o cambiar de fecha
  useEffect(() => {
    if (state?.currentDate != null) setViewingDate((prev) => {
      if (state.currentDate > prev || prev > datesCount) return state.currentDate
      return prev
    })
  }, [state?.currentDate, datesCount])

  const viewingDateData = state?.dates?.[viewingDate - 1] ?? null

  useEffect(() => {
    if (!tournamentId) return
    api.getTournament(tournamentId).then((t) => setTournamentName(t.name)).catch(() => {})
  }, [tournamentId])

  const handleStartEditName = () => {
    setEditNameValue(tournamentName || '')
    setEditingName(true)
  }

  const handleSaveName = async (e) => {
    if (e) e.preventDefault()
    const name = editNameValue.trim()
    if (!name) return
    setSavingName(true)
    setError(null)
    try {
      await api.updateTournament(tournamentId, { name })
      setTournamentName(name)
      setEditingName(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingName(false)
    }
  }

  if (!tournamentId) {
    navigate('/', { replace: true })
    return null
  }

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
        <Container>
          <Navbar.Brand as={Link} to="/">Spectra</Navbar.Brand>
          <Navbar.Toggle aria-controls="navbar-tournament" />
          <Navbar.Collapse id="navbar-tournament">
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/">Inicio</Nav.Link>
              <Nav.Link as={Link} to="/#ranking-general">Ranking general</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="py-4">
        <div className="mb-4 d-flex align-items-center flex-wrap gap-2">
          {editingName ? (
            <Form onSubmit={handleSaveName} className="d-flex align-items-center gap-2 flex-wrap">
              <Form.Control
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                placeholder="Nombre del torneo"
                className="form-control-lg"
                style={{ maxWidth: '320px' }}
                autoFocus
              />
              <Button type="submit" variant="primary" size="sm" disabled={savingName || !editNameValue.trim()}>
                {savingName ? <Spinner animation="border" size="sm" /> : 'Guardar'}
              </Button>
              <Button type="button" variant="outline-secondary" size="sm" onClick={() => setEditingName(false)} disabled={savingName}>
                Cancelar
              </Button>
            </Form>
          ) : (
            <>
              <h1 className="mb-0">{tournamentName || 'Torneo'} — Pádel</h1>
              <Button variant="outline-secondary" size="sm" onClick={handleStartEditName} className="align-baseline">
                Editar nombre
              </Button>
            </>
          )}
        </div>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {typeof error === 'string' ? error : error?.message ?? String(error)}
          </Alert>
        )}

        {state?.config && (
          <div className="mb-3 d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={async () => {
                if (!window.confirm('¿Reiniciar todo el torneo? Se perderá el progreso.')) return
                try {
                  await api.reset(tournamentId)
                  await fetchState()
                } catch (err) {
                  setError(err.message)
                }
              }}
            >
              Reiniciar torneo
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <p className="mt-2 text-muted">Cargando estado del torneo…</p>
          </div>
        ) : !state?.config ? (
          <TournamentConfig
            onSuccess={handleConfig}
            loading={actionLoading}
            error={error}
          />
        ) : state?.players?.length === 0 ? (
          <TournamentPlayers
            numPlayers={state.config.numPlayers}
            onSuccess={handlePlayers}
            loading={actionLoading}
            error={error}
          />
        ) : (
          <>
            {datesCount > 0 && (
              <div className="mb-3 d-flex flex-wrap align-items-center gap-2">
                <span className="text-muted small me-1">Fechas:</span>
                <div className="d-flex flex-wrap gap-1">
                  {Array.from({ length: datesCount }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`btn btn-sm ${viewingDate === num ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setViewingDate(num)}
                    >
                      Fecha {num}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <RoundView
              tournamentId={tournamentId}
              state={state}
              dateData={viewingDateData}
              viewingDate={viewingDate}
              onRefresh={fetchState}
              onGenerateMatches={handleGenerateMatches}
              onCompleteDate={handleCompleteDate}
              onNextDate={handleNextDate}
              canCompleteDate={canCompleteDate}
              loadingDateAction={actionLoading}
            />
          </>
        )}
      </Container>
    </>
  )
}
