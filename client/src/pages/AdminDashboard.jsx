import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container, Navbar, Nav, Button, Card, ListGroup, Spinner, Alert, Modal, Form } from 'react-bootstrap'
import * as api from '../api/tournament'
import { logout } from '../api/auth'

const SPORT_LABEL = { padel: 'Pádel', futbol: 'Fútbol', hockey: 'Hockey' }
const MODALITY_LABEL = { escalera: 'Escalera', grupo: 'Fase de Grupos', liga: 'Liga' }
// Deporte en orden alfabético: Fútbol, Hockey, Pádel
const SPORT_OPTIONS = [
  { value: 'futbol', label: 'Fútbol' },
  { value: 'hockey', label: 'Hockey' },
  { value: 'padel', label: 'Pádel' },
]
// Fútbol y Hockey: Grupo, Liga
const MODALITY_FUTBOL_HOCKEY = [
  { value: 'grupo', label: 'Fase de Grupos' },
  { value: 'liga', label: 'Liga' },
]
// Pádel: tres formatos distintos (individual vs parejas)
const FORMATO_PADEL = [
  { value: 'escalera', label: 'Escalera (individual)', desc: 'Ranking dinámico, retos y posiciones individuales' },
  { value: 'grupo', label: 'Fase de Grupos (parejas)', desc: 'Grupos, tablas por zona, clasificación a playoff' },
  { value: 'liga', label: 'Liga (parejas)', desc: 'Tabla única, fixture todos contra todos' },
]
const STATUS_OPTIONS = [{ value: 'active', label: 'Activo' }, { value: 'finished', label: 'Finalizado' }]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    sport: 'futbol',
    modality: 'grupo',
    status: 'active',
    start_date: '',
    end_date: '',
    rules: '',
  })

  const load = () => {
    setLoading(true)
    api.getTournaments()
      .then(setTournaments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const modalityOptions = form.sport === 'padel' ? FORMATO_PADEL : MODALITY_FUTBOL_HOCKEY
  const selectedFormatoDesc = form.sport === 'padel' && FORMATO_PADEL.find((o) => o.value === form.modality)?.desc

  const handleOpenCreate = () => {
    setForm({
      name: '',
      sport: 'futbol',
      modality: 'grupo',
      status: 'active',
      start_date: '',
      end_date: '',
      rules: '',
    })
    setShowCreateModal(true)
  }

  const handleSportChange = (newSport) => {
    const options = newSport === 'padel' ? FORMATO_PADEL : MODALITY_FUTBOL_HOCKEY
    setForm((f) => ({ ...f, sport: newSport, modality: options[0].value }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim() || undefined,
        sport: form.sport,
        modality: form.modality,
        status: form.status,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        rules: form.rules || '',
      }
      const created = await api.createTournament(payload)
      setShowCreateModal(false)
      if (created.sport === 'padel') {
        navigate(`/admin/torneo/${created.id}`)
      } else {
        navigate(`/admin/torneo/${created.id}`) // league admin
      }
    } catch (err) {
      setError(err.message)
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
    } catch (err) {
      setError(err.message)
    }
  }

  const formatDate = (iso) => {
    try {
      return iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
    } catch {
      return iso
    }
  }

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
        <Container>
          <Navbar.Brand as={Link} to="/admin">Spectra Admin</Navbar.Brand>
          <Navbar.Toggle aria-controls="admin-nav" />
          <Navbar.Collapse id="admin-nav">
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/">Ver web pública</Nav.Link>
              <Button variant="outline-light" size="sm" className="ms-2" onClick={() => { logout(); navigate('/admin/login'); }}>
                Cerrar sesión
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="py-4">
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
            {error}
          </Alert>
        )}

        <Card className="shadow-sm">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span className="fw-bold">Torneos</span>
            <Button variant="primary" size="sm" onClick={handleOpenCreate} disabled={creating}>
              Crear torneo
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" />
                <p className="mt-2 text-muted">Cargando…</p>
              </div>
            ) : tournaments.length === 0 ? (
              <p className="text-muted text-center py-5 mb-0">
                No hay torneos. Creá uno para empezar.
              </p>
            ) : (
              <ListGroup variant="flush">
                {tournaments.map((t) => (
                  <ListGroup.Item
                    key={t.id}
                    as={Link}
                    to={`/admin/torneo/${t.id}`}
                    action
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <span className="fw-semibold">{t.name}</span>
                      <span className="text-muted small ms-2">
                        {SPORT_LABEL[t.sport] || t.sport}
                        {t.sport === 'padel' && t.modality && ` · ${MODALITY_LABEL[t.modality] || t.modality}`}
                        {` · ${t.status}`}
                        {t.sport === 'padel' && t.modality === 'escalera' && t.config && ` · Fecha ${t.currentDate || '-'}`}
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
          <Form onSubmit={handleCreate}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Nombre</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ej: Liga 2025"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Deporte</Form.Label>
                <Form.Select
                  value={form.sport}
                  onChange={(e) => handleSportChange(e.target.value)}
                >
                  {SPORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>{form.sport === 'padel' ? 'Formato' : 'Modalidad'}</Form.Label>
                <Form.Select
                  value={form.modality}
                  onChange={(e) => setForm((f) => ({ ...f, modality: e.target.value }))}
                >
                  {modalityOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Form.Select>
                {form.sport === 'padel' && selectedFormatoDesc && (
                  <Form.Text className="text-muted d-block mt-1">{selectedFormatoDesc}</Form.Text>
                )}
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Estado</Form.Label>
                <Form.Select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Fecha inicio</Form.Label>
                <Form.Control
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Fecha fin</Form.Label>
                <Form.Control
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Reglamento (visible públicamente)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={form.rules}
                  onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value }))}
                  placeholder="Opcional"
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowCreateModal(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={creating}>
                {creating ? 'Creando…' : 'Crear'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </Container>
    </>
  )
}
