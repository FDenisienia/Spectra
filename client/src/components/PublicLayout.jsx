import { useState, useEffect, useMemo, useRef, useId } from 'react'
import { Link, Outlet, useParams, useLocation } from 'react-router-dom'
import { Nav, Spinner, Button, Accordion, Dropdown } from 'react-bootstrap'
import * as api from '../api/tournament'

function InstagramLogoIcon({ size = 24 }) {
  const gradientId = useId().replace(/:/g, '')
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id={`ig-gradient-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#833AB4" />
          <stop offset="50%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#F77737" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#ig-gradient-${gradientId})`}
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
      />
    </svg>
  )
}

const SPORT_LABEL = { padel: 'Pádel', futbol: 'Fútbol', hockey: 'Hockey' }
const FORMATO_LABEL = { escalera: 'Escalera', grupo: 'Fase de Grupos', liga: 'Liga' }

// Redes sociales – actualizar con datos reales
const WHATSAPP_NUMBER = '5492214097730' // Formato internacional sin + ni espacios (AR: 54 + 9 + 2214097730)

const INSTAGRAM_ACCOUNTS = [
  {
    label: 'Estrellas del Fútbol',
    href: 'https://www.instagram.com/estrellasdelfutbolok?igsh=MTR1NTFqcDBmaHg3MQ==',
    sport: 'futbol',
  },
  {
    label: 'Entre Amigas',
    href: 'https://www.instagram.com/entreamigashockey?igsh=b2wxbHg5MHY5eTFs',
    sport: 'hockey',
  },
  {
    label: 'Smash Open',
    href: 'https://www.instagram.com/smashopenok?igsh=ZDBjem5uYjI0bTl2',
    sport: 'padel',
  },
]

function ExternalLinkChevron() {
  return (
    <svg className="spectra-ig-external-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M7 17L17 7M17 7H9M17 7V15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Separación entre el menú y el FAB (drop="up"). Ajustá el segundo número (px) si querés más o menos espacio. */
const IG_MENU_POPPER_CONFIG = {
  modifiers: [{ name: 'offset', options: { offset: [0, 10] } }],
}

function InstagramMenu({ className = '', toggleClassName = '', iconSize = 24, align = 'end', drop = 'down' }) {
  const id = useId()
  const toggleId = `spectra-ig-${id.replace(/:/g, '')}`

  return (
    <Dropdown className={`spectra-instagram-dropdown ${className}`} align={align} drop={drop}>
      <Dropdown.Toggle
        as="button"
        type="button"
        id={toggleId}
        variant="link"
        className={`spectra-instagram-toggle ${toggleClassName}`}
        aria-label="Instagram — elegir cuenta"
      >
        <InstagramLogoIcon size={iconSize} />
      </Dropdown.Toggle>
      <Dropdown.Menu className="spectra-instagram-menu" popperConfig={IG_MENU_POPPER_CONFIG}>
        <Dropdown.Header className="spectra-ig-menu-header">Cuentas oficiales</Dropdown.Header>
        {INSTAGRAM_ACCOUNTS.map((acc) => (
          <Dropdown.Item
            key={acc.href}
            className="spectra-ig-item"
            href={acc.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="spectra-ig-item-inner">
              <span className="spectra-ig-item-main">
                <span className="spectra-ig-sport">{SPORT_LABEL[acc.sport]}</span>
                <span className="spectra-ig-name">{acc.label}</span>
              </span>
              <ExternalLinkChevron />
            </span>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  )
}

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
        {!isHome && (
          <Nav.Link as={Link} to="/admin" className="spectra-sidebar-link spectra-sidebar-admin mt-auto" onClick={() => setSidebarOpen(false)}>
            <span className="spectra-nav-icon">⚙</span>
            <span>Administración</span>
          </Nav.Link>
        )}
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
          <span className="spectra-topbar-spacer" aria-hidden="true" />
        </header>
        <main className="spectra-main">
          <Outlet />
        </main>
      </div>

      {/* Botones flotantes: Instagram arriba, WhatsApp abajo */}
      <div className="spectra-float-socials">
        <InstagramMenu
          toggleClassName="spectra-instagram-float"
          iconSize={24}
          drop="up"
        />
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="spectra-whatsapp-float"
          aria-label="Contactar por WhatsApp"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      </div>
    </div>
  )
}
