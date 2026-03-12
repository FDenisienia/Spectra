import { useState, useEffect, useMemo, useRef } from 'react'
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
  const location = useLocation()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openAccordionKey, setOpenAccordionKey] = useState(null)
  const prevPathRef = useRef(location.pathname)
  const prevRouteKeyRef = useRef(null)

  const isHome = location.pathname === '/'
  const isOnTournamentPage = Boolean(tournamentId)

  const activeTournament = useMemo(
    () => tournaments.find((t) => String(t.id) === tournamentId),
    [tournaments, tournamentId]
  )

  const routeDerivedAccordionKey = useMemo(() => {
    if (!isOnTournamentPage || !activeTournament) return null
    const section = SIDEBAR_SECTIONS.find((s) => s.sport === activeTournament.sport)
    return section?.key ?? null
  }, [isOnTournamentPage, activeTournament])

  useEffect(() => {
    const pathJustChanged = prevPathRef.current !== location.pathname
    const routeKeyJustAvailable = !prevRouteKeyRef.current && routeDerivedAccordionKey

    if (pathJustChanged) prevPathRef.current = location.pathname
    prevRouteKeyRef.current = routeDerivedAccordionKey

    if (pathJustChanged || routeKeyJustAvailable) {
      if (location.pathname === '/') {
        setOpenAccordionKey(null)
      } else if (routeDerivedAccordionKey) {
        setOpenAccordionKey(routeDerivedAccordionKey)
      }
    }
  }, [location.pathname, routeDerivedAccordionKey])

  const handleAccordionSelect = (eventKey) => {
    setOpenAccordionKey((prev) => (prev === eventKey ? null : eventKey))
  }

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
        <Link to="/" className="spectra-brand d-flex align-items-center" onClick={() => setSidebarOpen(false)}>
          <img src="/images/spectra-logo.png" alt="Spectra" className="spectra-logo spectra-logo-sidebar" />
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
        <Nav.Link as={Link} to="/" className={`spectra-sidebar-link spectra-sidebar-link-home ${isHome ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
          Inicio
        </Nav.Link>
        <div className="spectra-sidebar-sections">
          {loading ? (
            <div className="spectra-sidebar-loading px-3 py-2">
              <Spinner animation="border" size="sm" />
              <span className="ms-2 small text-muted">Cargando…</span>
            </div>
          ) : (
            <Accordion
              activeKey={openAccordionKey}
              onSelect={handleAccordionSelect}
              flush
              className="spectra-sidebar-accordion"
            >
              {SIDEBAR_SECTIONS.map((section) => {
                const list = bySport(section.sport)
                const isActiveSection = routeDerivedAccordionKey === section.key
                return (
                  <Accordion.Item
                    key={section.key}
                    eventKey={section.key}
                    className={`spectra-sidebar-accordion-item ${isActiveSection ? 'spectra-accordion-item-active' : ''}`}
                  >
                    <Accordion.Header className="spectra-sidebar-accordion-header">
                      {section.label}
                    </Accordion.Header>
                    <Accordion.Body className="spectra-sidebar-accordion-body">
                      {list.length === 0 ? (
                        <p className="spectra-sidebar-empty mb-0">No hay torneos activos</p>
                      ) : (
                        <Nav className="flex-column spectra-tournament-list">
                          {list.map((t) => (
                            <Nav.Link
                              key={t.id}
                              as={Link}
                              to={`/torneo/${t.id}`}
                              className={`spectra-tournament-item ${tournamentId === String(t.id) ? 'active' : ''}`}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <span className="spectra-tournament-name">{t.name}</span>
                              <span className="spectra-tournament-meta">
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
          <span className="spectra-nav-icon">⚙</span>
          <span>Administración</span>
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
          <Link to="/" className="spectra-topbar-brand d-flex align-items-center">
            <img src="/images/spectra-logo.png" alt="Spectra" className="spectra-logo spectra-logo-topbar" />
          </Link>
          <span className="spectra-topbar-spacer" />
        </header>
        <main className="spectra-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
