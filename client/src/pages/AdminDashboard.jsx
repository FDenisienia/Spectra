import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Container, Navbar, Nav, Button, Card, ListGroup, Spinner, Alert, Modal, Form, Nav as BootstrapNav } from 'react-bootstrap'
import * as api from '../api/tournament'
import { logout, changePassword } from '../api/auth'
import { useConfirm } from '../hooks/useConfirm'

const SPORT_LABEL = { padel: 'Pádel', futbol: 'Fútbol', hockey: 'Hockey' }
const MODALITY_LABEL = { escalera: 'Escalera', grupo: 'Fase de Grupos', liga: 'Liga' }
const GENDER_LABEL = { masculino: 'Masculino', femenino: 'Femenino', mixto: 'Mixto' }
const STATUS_LABEL = { active: 'Activo', finished: 'Finalizado', inactive: 'Desactivado' }
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
const REGLAMENTO_MAX_BYTES = 5 * 1024 * 1024
const GENDER_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'mixto', label: 'Mixto' },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { confirm, ConfirmDialog } = useConfirm()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [changingPassword, setChangingPassword] = useState(false)
  const [form, setForm] = useState({
    name: '',
    sport: 'futbol',
    modality: 'grupo',
    gender: '',
    status: 'active',
    start_date: '',
    end_date: '',
  })
  const [reglamentoFile, setReglamentoFile] = useState(null)
  const [reglamentoInputKey, setReglamentoInputKey] = useState(0)
  const [listTab, setListTab] = useState('published')
  const [togglingId, setTogglingId] = useState(null)

  const load = () => {
    setLoading(true)
    api.getTournaments({ all: true })
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
      gender: '',
      status: 'active',
      start_date: '',
      end_date: '',
    })
    setReglamentoFile(null)
    setReglamentoInputKey((k) => k + 1)
    setShowCreateModal(true)
  }

  const handleReglamentoChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) {
      setReglamentoFile(null)
      return
    }
    if (f.size > REGLAMENTO_MAX_BYTES) {
      setError('El PDF no puede superar 5 MB')
      e.target.value = ''
      setReglamentoFile(null)
      return
    }
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Solo se permiten archivos PDF')
      e.target.value = ''
      setReglamentoFile(null)
      return
    }
    setReglamentoFile(f)
    setError(null)
  }

  const clearReglamentoSelection = () => {
    setReglamentoFile(null)
    setReglamentoInputKey((k) => k + 1)
  }

  const handleSportChange = (newSport) => {
    const options = newSport === 'padel' ? FORMATO_PADEL : MODALITY_FUTBOL_HOCKEY
    setForm((f) => ({ ...f, sport: newSport, modality: options[0].value, gender: newSport !== 'futbol' ? '' : f.gender }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      fd.append('sport', form.sport)
      fd.append('modality', form.modality)
      fd.append('gender', form.sport === 'futbol' ? (form.gender || '') : '')
      fd.append('status', form.status)
      fd.append('start_date', form.start_date || '')
      fd.append('end_date', form.end_date || '')
      if (reglamentoFile) {
        fd.append('reglamento', reglamentoFile, reglamentoFile.name)
      }
      const created = await api.createTournament(fd)
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

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwordForm.new !== passwordForm.confirm) {
      setError('La nueva contraseña y la confirmación no coinciden')
      return
    }
    if (passwordForm.new.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }
    setChangingPassword(true)
    setError(null)
    try {
      await changePassword(passwordForm.current, passwordForm.new)
      setShowPasswordModal(false)
      setPasswordForm({ current: '', new: '', confirm: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setChangingPassword(false)
    }
  }

  const handleDelete = async (e, id, name) => {
    e.preventDefault()
    e.stopPropagation()
    if (!(await confirm({
      title: 'Eliminar torneo',
      message: `¿Eliminar el torneo "${name}"? No se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    }))) return
    try {
      await api.deleteTournament(id)
      setTournaments((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleToggleVisibility = async (e, t) => {
    e.preventDefault()
    e.stopPropagation()
    const deactivating = t.status !== 'inactive'
    if (deactivating && !(await confirm({
      title: 'Desactivar torneo',
      message: `¿Desactivar "${t.name}"? Dejará de mostrarse en la web pública.`,
      confirmLabel: 'Desactivar',
      variant: 'warning',
    }))) return
    setTogglingId(t.id)
    setError(null)
    try {
      await api.updateTournament(t.id, { status: deactivating ? 'inactive' : 'active' })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setTogglingId(null)
    }
  }

  const visibleTournaments = tournaments.filter((t) =>
    listTab === 'inactive' ? t.status === 'inactive' : t.status !== 'inactive'
  )

  const tournamentMeta = (t) => {
    const parts = [
      SPORT_LABEL[t.sport] || t.sport,
      t.sport === 'futbol' && t.gender ? GENDER_LABEL[t.gender] || t.gender : null,
      t.sport === 'padel' && t.modality ? MODALITY_LABEL[t.modality] || t.modality : null,
      STATUS_LABEL[t.status] || t.status,
      t.sport === 'padel' && t.modality === 'escalera' && t.config ? `Fecha ${t.currentDate || '-'}` : null,
    ].filter(Boolean)
    return parts.join(' · ')
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
              <Button variant="outline-light" size="sm" onClick={() => { setPasswordForm({ current: '', new: '', confirm: '' }); setShowPasswordModal(true); }}>
                Cambiar contraseña
              </Button>
              <Button variant="outline-light" size="sm" className="ms-2" onClick={() => { logout(); navigate('/admin/login'); }}>
                Cerrar sesión
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="py-3 py-md-4 px-3 px-md-0">
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
            {error}
          </Alert>
        )}

        <Card className="shadow-sm">
          <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <BootstrapNav variant="tabs" className="admin-tournament-tabs border-0">
              <BootstrapNav.Item>
                <BootstrapNav.Link
                  active={listTab === 'published'}
                  onClick={() => setListTab('published')}
                  className="py-1"
                >
                  Activos
                </BootstrapNav.Link>
              </BootstrapNav.Item>
              <BootstrapNav.Item>
                <BootstrapNav.Link
                  active={listTab === 'inactive'}
                  onClick={() => setListTab('inactive')}
                  className="py-1"
                >
                  Desactivados
                </BootstrapNav.Link>
              </BootstrapNav.Item>
            </BootstrapNav>
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
            ) : visibleTournaments.length === 0 ? (
              <p className="text-muted text-center py-5 mb-0">
                {listTab === 'inactive'
                  ? 'No hay torneos desactivados.'
                  : 'No hay torneos activos. Creá uno para empezar.'}
              </p>
            ) : (
              <ListGroup variant="flush">
                {visibleTournaments.map((t) => (
                  <ListGroup.Item
                    key={t.id}
                    as={Link}
                    to={`/admin/torneo/${t.id}`}
                    action
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <span className="fw-semibold">{t.name}</span>
                      <span className="text-muted small ms-2">{tournamentMeta(t)}</span>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                      <span className="text-muted small d-none d-sm-inline">{formatDate(t.createdAt)}</span>
                      <Button
                        variant={t.status === 'inactive' ? 'outline-success' : 'outline-secondary'}
                        size="sm"
                        disabled={togglingId === t.id}
                        onClick={(e) => handleToggleVisibility(e, t)}
                      >
                        {togglingId === t.id ? '…' : t.status === 'inactive' ? 'Activar' : 'Desactivar'}
                      </Button>
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
              {form.sport === 'futbol' && (
                <Form.Group className="mb-3">
                  <Form.Label>Categoría</Form.Label>
                  <Form.Select
                    value={form.gender}
                    onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  >
                    <option value="">Seleccionar...</option>
                    {GENDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              )}
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
                <Form.Label>Reglamento (PDF, opcional · máx. 5 MB)</Form.Label>
                <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2">
                  <Form.Control
                    key={reglamentoInputKey}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleReglamentoChange}
                    className="flex-grow-1"
                  />
                  {reglamentoFile && (
                    <Button variant="outline-secondary" size="sm" type="button" onClick={clearReglamentoSelection}>
                      Quitar archivo
                    </Button>
                  )}
                </div>
                {reglamentoFile && (
                  <Form.Text className="text-muted d-block mt-2">{reglamentoFile.name}</Form.Text>
                )}
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

        <Modal show={showPasswordModal} onHide={() => !changingPassword && setShowPasswordModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Cambiar contraseña</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleChangePassword}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Contraseña actual</Form.Label>
                <Form.Control
                  type="password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
                  placeholder="Contraseña actual"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Nueva contraseña</Form.Label>
                <Form.Control
                  type="password"
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, new: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Confirmar nueva contraseña</Form.Label>
                <Form.Control
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repetir nueva contraseña"
                  minLength={6}
                  required
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowPasswordModal(false)} disabled={changingPassword}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={changingPassword}>
                {changingPassword ? 'Guardando…' : 'Guardar'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
        <ConfirmDialog />
      </Container>
    </>
  )
}
