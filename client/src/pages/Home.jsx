import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container, Navbar, Nav, Button, Card, ListGroup, Spinner, Alert, Table, Modal, Form } from 'react-bootstrap'
import * as api from '../api/tournament'

export default function Home() {
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [globalRanking, setGlobalRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingRanking, setLoadingRanking] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTournamentName, setNewTournamentName] = useState('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const [list, ranking] = await Promise.all([
          api.getTournaments(),
          api.getGlobalRanking().catch(() => []),
        ])
        if (!cancelled) {
          setTournaments(list)
          setGlobalRanking(Array.isArray(ranking) ? ranking : [])
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) {
          setLoading(false)
          setLoadingRanking(false)
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const handleOpenCreateModal = () => {
    setNewTournamentName('')
    setShowCreateModal(true)
  }

  const handleCreateTournament = async (e) => {
    if (e) e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const name = newTournamentName.trim() || undefined
      const { id } = await api.createTournament(name)
      setShowCreateModal(false)
      setNewTournamentName('')
      navigate(`/torneo/${id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (e, id, name) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`¿Eliminar el torneo "${name}"? No se puede deshacer.`)) return
    try {
      await api.deleteTournament(id)
      setTournaments((prev) => prev.filter((t) => t.id !== id))
      api.getGlobalRanking().then(setGlobalRanking).catch(() => {})
    } catch (err) {
      setError(err.message)
    }
  }

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return iso
    }
  }

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
        <Container>
          <Navbar.Brand href="/">Spectra</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/">Inicio</Nav.Link>
              <Nav.Link href="#ranking-general">Ranking general</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <section className="hero text-center mb-5">
        <Container>
          <h1 className="display-4 fw-bold mb-3">Bienvenido a Spectra</h1>
          <p className="lead opacity-90">
            WebApp con torneo de pádel formato escalera
          </p>
          <Button
            variant="light"
            size="lg"
            className="mt-3"
            onClick={handleOpenCreateModal}
            disabled={creating}
          >
            {creating ? <><Spinner animation="border" size="sm" className="me-2" />Creando…</> : 'Crear torneo'}
          </Button>
        </Container>
      </section>

      <Container className="mb-5">
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
            {error}
          </Alert>
        )}

        <Card className="shadow-sm">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span className="fw-bold">Tus torneos</span>
            <Button variant="outline-primary" size="sm" onClick={handleOpenCreateModal} disabled={creating}>
              Crear torneo
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
                <p className="mt-2 text-muted">Cargando torneos…</p>
              </div>
            ) : tournaments.length === 0 ? (
              <p className="text-muted text-center py-5 mb-0">
                No tenés torneos todavía. Creá uno con el botón de arriba.
              </p>
            ) : (
              <ListGroup variant="flush">
                {tournaments.map((t) => (
                  <ListGroup.Item
                    key={t.id}
                    as={Link}
                    to={`/torneo/${t.id}`}
                    action
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <span className="fw-semibold">{t.name}</span>
                      <span className="text-muted small ms-2">
                        — {t.config ? `${t.config.numCourts} canchas, ${t.config.numPlayers} jugadores` : 'Sin configurar'}
                        {t.currentDate ? ` · Fecha ${t.currentDate}` : ''}
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted small">{formatDate(t.createdAt)}</span>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={(e) => handleDelete(e, t.id, t.name)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card.Body>
        </Card>

        <Modal show={showCreateModal} onHide={() => !creating && setShowCreateModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Crear torneo</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleCreateTournament}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Nombre del torneo</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ej: Torneo de verano 2025"
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  autoFocus
                />
                <Form.Text className="text-muted">Opcional. Si lo dejás vacío se usará un nombre por defecto.</Form.Text>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={creating}>
                {creating ? <><Spinner animation="border" size="sm" className="me-2" />Creando…</> : 'Crear torneo'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        <Card id="ranking-general" className="shadow-sm mt-4">
          <Card.Header className="fw-bold">Ranking general entre torneos</Card.Header>
          <Card.Body className="p-0">
            {loadingRanking ? (
              <div className="text-center py-4">
                <Spinner animation="border" size="sm" />
                <span className="ms-2 text-muted">Cargando ranking…</span>
              </div>
            ) : globalRanking.length === 0 ? (
              <p className="text-muted text-center py-4 mb-0">
                Todavía no hay datos. Los jugadores aparecerán cuando haya partidos jugados en algún torneo.
              </p>
            ) : (
              <Table responsive hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Jugador</th>
                    <th>Partidos</th>
                    <th>Sets</th>
                    <th>Games</th>
                    <th>Torneos</th>
                  </tr>
                </thead>
                <tbody>
                  {globalRanking.map((row, i) => (
                    <tr key={row.name}>
                      <td className="fw-semibold">{i + 1}</td>
                      <td>{row.name}</td>
                      <td>{row.totalMatches ?? 0}</td>
                      <td>{row.totalSets ?? 0}</td>
                      <td>{row.totalGames ?? 0}</td>
                      <td className="text-muted small">{row.tournamentsPlayed ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Container>

      <footer className="bg-dark text-light py-4 mt-5">
        <Container className="text-center">
          <small>Spectra © {new Date().getFullYear()} — Torneo Escalera Pádel</small>
        </Container>
      </footer>
    </>
  )
}
