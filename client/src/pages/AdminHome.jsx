import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Container,
  Navbar,
  Nav,
  Button,
  Card,
  Form,
  ListGroup,
  Spinner,
  Alert,
  Modal,
} from 'react-bootstrap'
import * as api from '../api/home'
import { logout } from '../api/auth'

export default function AdminHome() {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showHeroModal, setShowHeroModal] = useState(false)
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [showSponsorModal, setShowSponsorModal] = useState(false)
  const [editingGalleryId, setEditingGalleryId] = useState(null)
  const [editingSponsorId, setEditingSponsorId] = useState(null)
  const [heroForm, setHeroForm] = useState({ heroTitle: '', heroDescription: '' })
  const [galleryForm, setGalleryForm] = useState({ url: '', alt: '' })
  const [sponsorForm, setSponsorForm] = useState({ name: '', logoUrl: '', link: '' })

  const load = () => {
    setLoading(true)
    api
      .getHomeContent()
      .then((data) => {
        setContent(data)
        setHeroForm({
          heroTitle: data.heroTitle || '',
          heroDescription: data.heroDescription || '',
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleSaveHero = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.updateHeroContent(heroForm)
      setShowHeroModal(false)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleOpenHeroModal = () => {
    setHeroForm({
      heroTitle: content?.heroTitle || '',
      heroDescription: content?.heroDescription || '',
    })
    setShowHeroModal(true)
  }

  const handleOpenGalleryModal = (item = null) => {
    setEditingGalleryId(item?.id ?? null)
    setGalleryForm({ url: item?.url || '', alt: item?.alt || '' })
    setShowGalleryModal(true)
  }

  const handleSaveGallery = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingGalleryId) {
        await api.updateGalleryImage(editingGalleryId, galleryForm)
      } else {
        await api.createGalleryImage(galleryForm)
      }
      setShowGalleryModal(false)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGallery = async (id) => {
    if (!window.confirm('¿Eliminar esta imagen?')) return
    try {
      await api.deleteGalleryImage(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleMoveGallery = async (index, direction) => {
    const gallery = content?.gallery || []
    if (gallery.length < 2) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= gallery.length) return
    const ids = gallery.map((g) => g.id)
    ;[ids[index], ids[newIndex]] = [ids[newIndex], ids[index]]
    try {
      await api.reorderGallery(ids)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleOpenSponsorModal = (item = null) => {
    setEditingSponsorId(item?.id ?? null)
    setSponsorForm({
      name: item?.name || '',
      logoUrl: item?.logoUrl || '',
      link: item?.link || '',
    })
    setShowSponsorModal(true)
  }

  const handleSaveSponsor = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingSponsorId) {
        await api.updateSponsor(editingSponsorId, sponsorForm)
      } else {
        await api.createSponsor(sponsorForm)
      }
      setShowSponsorModal(false)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSponsor = async (id) => {
    if (!window.confirm('¿Eliminar este sponsor?')) return
    try {
      await api.deleteSponsor(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleMoveSponsor = async (index, direction) => {
    const sponsors = content?.sponsors || []
    if (sponsors.length < 2) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= sponsors.length) return
    const ids = sponsors.map((s) => s.id)
    ;[ids[index], ids[newIndex]] = [ids[newIndex], ids[index]]
    try {
      await api.reorderSponsors(ids)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
          <Container>
            <Navbar.Brand as={Link} to="/admin">Spectra Admin</Navbar.Brand>
          </Container>
        </Navbar>
        <Container className="py-5 text-center">
          <Spinner animation="border" />
          <p className="mt-2 text-muted">Cargando...</p>
        </Container>
      </>
    )
  }

  const gallery = content?.gallery || []
  const sponsors = content?.sponsors || []

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
        <Container>
          <Navbar.Brand as={Link} to="/admin">Spectra Admin</Navbar.Brand>
          <Navbar.Toggle aria-controls="admin-home-nav" />
          <Navbar.Collapse id="admin-home-nav">
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/admin">Torneos</Nav.Link>
              <Nav.Link as={Link} to="/">Ver web</Nav.Link>
              <Button variant="outline-light" size="sm" onClick={() => { logout(); window.location.href = '/admin/login'; }}>
                Cerrar sesión
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="py-4 px-3">
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
            {error}
          </Alert>
        )}

        <h1 className="h4 mb-4">Contenido de la Home</h1>

        {/* Hero */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span className="fw-bold">Hero / Presentación</span>
            <Button variant="outline-primary" size="sm" onClick={handleOpenHeroModal}>
              Editar
            </Button>
          </Card.Header>
          <Card.Body>
            <h2 className="h6 text-muted mb-1">Título</h2>
            <p className="mb-3">{content?.heroTitle || '—'}</p>
            <h2 className="h6 text-muted mb-1">Descripción</h2>
            <p className="mb-0 small">{content?.heroDescription || '—'}</p>
          </Card.Body>
        </Card>

        {/* Galería */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span className="fw-bold">Galería de fotos</span>
            <Button variant="primary" size="sm" onClick={() => handleOpenGalleryModal()}>
              Agregar imagen
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            {gallery.length === 0 ? (
              <p className="text-muted text-center py-4 mb-0">
                No hay imágenes. Agregá una con URL.
              </p>
            ) : (
              <ListGroup variant="flush">
                {gallery.map((img, i) => (
                  <ListGroup.Item key={img.id} className="d-flex align-items-center gap-3">
                    {img.url && (
                      <img
                        src={img.url}
                        alt={img.alt || ''}
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    )}
                    <div className="flex-grow-1 min-w-0">
                      <small className="text-muted d-block text-truncate">{img.url}</small>
                      {img.alt && <small>{img.alt}</small>}
                    </div>
                    <div className="d-flex gap-1">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleMoveGallery(i, 'up')}
                        disabled={i === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleMoveGallery(i, 'down')}
                        disabled={i === gallery.length - 1}
                      >
                        ↓
                      </Button>
                      <Button variant="outline-primary" size="sm" onClick={() => handleOpenGalleryModal(img)}>
                        Editar
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDeleteGallery(img.id)}>
                        Eliminar
                      </Button>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card.Body>
        </Card>

        {/* Sponsors */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span className="fw-bold">Sponsors</span>
            <Button variant="primary" size="sm" onClick={() => handleOpenSponsorModal()}>
              Agregar sponsor
            </Button>
          </Card.Header>
          <Card.Body className="p-0">
            {sponsors.length === 0 ? (
              <p className="text-muted text-center py-4 mb-0">
                No hay sponsors cargados.
              </p>
            ) : (
              <ListGroup variant="flush">
                {sponsors.map((s, i) => (
                  <ListGroup.Item key={s.id} className="d-flex align-items-center gap-3">
                    {s.logoUrl ? (
                      <img
                        src={s.logoUrl}
                        alt={s.name}
                        style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6 }}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div style={{ width: 48, height: 48, background: '#f1f5f9', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                        {s.name?.slice(0, 2) || '—'}
                      </div>
                    )}
                    <div className="flex-grow-1">
                      <span className="fw-semibold">{s.name}</span>
                      {s.link && <small className="text-muted d-block">{s.link}</small>}
                    </div>
                    <div className="d-flex gap-1">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleMoveSponsor(i, 'up')}
                        disabled={i === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => handleMoveSponsor(i, 'down')}
                        disabled={i === sponsors.length - 1}
                      >
                        ↓
                      </Button>
                      <Button variant="outline-primary" size="sm" onClick={() => handleOpenSponsorModal(s)}>
                        Editar
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDeleteSponsor(s.id)}>
                        Eliminar
                      </Button>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card.Body>
        </Card>

        <p className="text-muted small">
          Las imágenes de la galería y logos de sponsors se cargan por URL. Pegá la URL completa de la imagen (ej. /images/foto.jpg si está en public, o una URL externa).
        </p>
      </Container>

      {/* Modal Hero */}
      <Modal show={showHeroModal} onHide={() => !saving && setShowHeroModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar Hero / Presentación</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveHero}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Título</Form.Label>
              <Form.Control
                type="text"
                value={heroForm.heroTitle}
                onChange={(e) => setHeroForm((f) => ({ ...f, heroTitle: e.target.value }))}
                placeholder="Espectra Producciones"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Descripción institucional</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                value={heroForm.heroDescription}
                onChange={(e) => setHeroForm((f) => ({ ...f, heroDescription: e.target.value }))}
                placeholder="Descripción de la organización..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowHeroModal(false)} disabled={saving}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal Galería */}
      <Modal show={showGalleryModal} onHide={() => !saving && setShowGalleryModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingGalleryId ? 'Editar imagen' : 'Agregar imagen'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveGallery}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>URL de la imagen</Form.Label>
              <Form.Control
                type="text"
                value={galleryForm.url}
                onChange={(e) => setGalleryForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://... o /images/foto.jpg"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Texto alternativo (opcional)</Form.Label>
              <Form.Control
                type="text"
                value={galleryForm.alt}
                onChange={(e) => setGalleryForm((f) => ({ ...f, alt: e.target.value }))}
                placeholder="Descripción de la imagen"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowGalleryModal(false)} disabled={saving}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={saving || !galleryForm.url}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal Sponsor */}
      <Modal show={showSponsorModal} onHide={() => !saving && setShowSponsorModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editingSponsorId ? 'Editar sponsor' : 'Agregar sponsor'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveSponsor}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                value={sponsorForm.name}
                onChange={(e) => setSponsorForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre del sponsor"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>URL del logo (opcional)</Form.Label>
              <Form.Control
                type="text"
                value={sponsorForm.logoUrl}
                onChange={(e) => setSponsorForm((f) => ({ ...f, logoUrl: e.target.value }))}
                placeholder="https://... o /images/logo.png"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Link (opcional)</Form.Label>
              <Form.Control
                type="text"
                value={sponsorForm.link}
                onChange={(e) => setSponsorForm((f) => ({ ...f, link: e.target.value }))}
                placeholder="https://..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSponsorModal(false)} disabled={saving}>Cancelar</Button>
            <Button variant="primary" type="submit" disabled={saving || !sponsorForm.name}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  )
}
