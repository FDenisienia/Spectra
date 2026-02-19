import { useState, useEffect } from 'react'
import { Link, Outlet, useParams, useLocation } from 'react-router-dom'
import { Nav, Spinner, Button, Accordion } from 'react-bootstrap'
import * as api from '../api/tournament'

const SPORT_LABEL = { padel: 'Pádel', futbol: 'Fútbol', hockey: 'Hockey' }
const FORMATO_LABEL = { escalera: 'Escalera', grupo: 'Fase de Grupos', liga: 'Liga' }

const SIDEBAR_SECTIONS = [
  { key: 'smash-open', label: 'Smash Open', sport: 'padel' },
  { key: 'entre-amigas', label: 'Entre Amigas', sport: 'hockey' },
  { key: 'estrellas-futbol', label: 'Estrellas del Fútbol', sport: 'futbol' },
]

export default function PublicLayout() {
  const { id: tournamentId } = useParams()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    api.getTournaments()
      .then((list) => {
        if (!cancelled) setTournaments(Array.isArray(list) ? list : [])
      })
      .catch(() => { if (!cancelled) setTournaments([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const activeTournaments = tournaments.filter((t) => t.status === 'active')
  const bySport = (sport) => activeTournaments.filter((t) => t.sport === sport)

  const SidebarContent = () => (
    <>
      <div className="spectra-sidebar-brand-wrap">
        <Link to="/" className="spectra-brand" onClick={() => setSidebarOpen(false)}>
          Spectra
        </Link>
        <Button
          variant="link"
          className="spectra-sidebar-close d-md-none"
          onClick={() => setSidebarOpen(false)}
          aria-label="Cerrar menú"
        >
          ✕
        </Button>
      </div>
      <Nav as="nav" className="spectra-sidebar-nav flex-column">
        <Nav.Link as={Link} to="/" className="spectra-sidebar-link" onClick={() => setSidebarOpen(false)}>
          Inicio
        </Nav.Link>
        <div className="spectra-sidebar-sections">
          {loading ? (
            <div className="spectra-sidebar-loading px-3 py-2">
              <Spinner animation="border" size="sm" />
              <span className="ms-2 small text-muted">Cargando…</span>
            </div>
          ) : (
            <Accordion defaultActiveKey={SIDEBAR_SECTIONS.map((s) => s.key)} flush className="spectra-sidebar-accordion">
              {SIDEBAR_SECTIONS.map((section) => {
                const list = bySport(section.sport)
                return (
                  <Accordion.Item key={section.key} eventKey={section.key} className="spectra-sidebar-accordion-item">
                    <Accordion.Header className="spectra-sidebar-accordion-header">
                      {section.label}
                    </Accordion.Header>
                    <Accordion.Body className="spectra-sidebar-accordion-body">
                      {list.length === 0 ? (
                        <p className="spectra-sidebar-empty mb-0">No hay torneos activos</p>
                      ) : (
                        <Nav className="flex-column gap-1">
                          {list.map((t) => (
                            <Nav.Link
                              key={t.id}
                              as={Link}
                              to={`/torneo/${t.id}`}
                              className={`spectra-sidebar-link ${tournamentId === String(t.id) ? 'active' : ''}`}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <span className="d-block fw-medium">{t.name}</span>
                              <span className="small text-muted">
                                {SPORT_LABEL[t.sport] || t.sport}
                                {t.sport === 'padel' && t.modality && ` · ${FORMATO_LABEL[t.modality] || t.modality}`}
                              </span>
                            </Nav.Link>
                          ))}
                        </Nav>
                      )}
                    </Accordion.Body>
                  </Accordion.Item>
                )
              })}
            </Accordion>
          )}
        </div>
        <Nav.Link as={Link} to="/admin" className="spectra-sidebar-link spectra-sidebar-admin mt-auto" onClick={() => setSidebarOpen(false)}>
          Administración
        </Nav.Link>
      </Nav>
    </>
  )

  return (
    <div className="public-layout public-layout-sidebar">
      {sidebarOpen && (
        <div
          className="spectra-overlay d-md-none"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Cerrar menú"
        />
      )}

      <aside className={`spectra-sidebar ${sidebarOpen ? 'spectra-sidebar-open' : ''}`}>
        <SidebarContent />
      </aside>

      <div className="spectra-main-wrap">
        <header className="spectra-topbar d-md-none">
          <Button
            variant="link"
            className="spectra-menu-btn"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            <span className="spectra-menu-btn-icon">{sidebarOpen ? '✕' : '☰'}</span>
          </Button>
          <Link to="/" className="spectra-topbar-brand">Spectra</Link>
          <span className="spectra-topbar-spacer" />
        </header>
        <main className="spectra-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
