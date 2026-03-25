import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Container, Card, Table, Spinner, Alert, Button, Nav } from 'react-bootstrap'
import * as api from '../api/league'
import { formatMatchDateTimeArgentina } from '../utils/matchDateTime'
import TournamentLogo from '../components/tournament/TournamentLogo'
import '../styles/League.css'
import '../styles/TeamDetailSlider.css'

const SECTIONS_ALL = [
  { key: 'players', label: 'Jugadores', icon: '👥' },
  { key: 'scorers', label: 'Goleadores', icon: '⚽' },
  { key: 'discipline', label: 'Tarjetas', icon: '🟨' },
  { key: 'dates', label: 'Fechas', icon: '📅' },
]
const SECTIONS_PADEL = [
  { key: 'players', label: 'Integrantes', icon: '👥' },
  { key: 'dates', label: 'Fechas', icon: '📅' },
]

function roleLabel(role) {
  const labels = { captain: 'Capitán', player: 'Jugador', guest: 'Invitado' }
  return labels[role] || 'Jugador'
}

export default function TeamDetail({ tournamentId, tournament = {} }) {
  const isPadel = tournament.sport === 'padel'
  const isHockey = tournament.sport === 'hockey'
  const SECTIONS = isPadel ? SECTIONS_PADEL : SECTIONS_ALL
  const { teamId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [suspensionByPlayer, setSuspensionByPlayer] = useState({})
  const [activeSection, setActiveSection] = useState(0)
  const [dateIndex, setDateIndex] = useState(0)

  const load = useCallback(async () => {
    if (!tournamentId || !teamId) return
    setLoading(true)
    setError(null)
    try {
      const [detail, suspensions] = await Promise.all([
        api.getTeamDetail(tournamentId, teamId),
        api.getSuspensions(tournamentId, { activeOnly: true }).catch(() => []),
      ])
      setData(detail)
      // Mapa: player_name -> { dates_pending } para jugadores suspendidos de este equipo
      const suspensionMap = {}
      if (Array.isArray(suspensions)) {
        suspensions.filter((s) => s.team_id === teamId).forEach((s) => {
          const name = s.player_name
          if (!suspensionMap[name]) suspensionMap[name] = 0
          suspensionMap[name] += s.dates_pending ?? Math.max(0, (s.dates_total ?? 0) - (s.dates_served ?? 0))
        })
      }
      setSuspensionByPlayer(suspensionMap)
    } catch (e) {
      setError(e.message)
      setData(null)
      setSuspensionByPlayer({})
    } finally {
      setLoading(false)
    }
  }, [tournamentId, teamId])

  useEffect(() => {
    load()
  }, [load])

  // Todas las fechas: anteriores (todas las jugadas), actual, próxima
  const dateItems = []
  const previousMatches = data?.previousMatches ?? (data?.previousMatch ? [data.previousMatch] : [])
  previousMatches.forEach((match, i) => {
    const isLastPrevious = i === previousMatches.length - 1
    dateItems.push({
      type: 'previous',
      label: isLastPrevious ? 'Fecha anterior' : `Fecha ${match.matchday_number}`,
      match,
    })
  })
  if (data?.currentMatch) dateItems.push({ type: 'current', label: 'Fecha actual', match: data.currentMatch })
  const nextToShow = data?.nextAfterCurrent ?? (data?.nextMatch && data.nextMatch.id !== data?.currentMatch?.id ? data.nextMatch : null)
  if (nextToShow) dateItems.push({ type: 'next', label: 'Próxima fecha', match: nextToShow })
  const datesSectionIndex = isPadel ? 1 : 3
  const currentDateItemIndex = dateItems.findIndex((i) => i.type === 'current')
  const safeDateIndex = Math.min(Math.max(0, dateIndex), Math.max(0, dateItems.length - 1))

  // Al cargar datos: índice inicial en "Fecha actual"
  useEffect(() => {
    const idx = currentDateItemIndex >= 0 ? currentDateItemIndex : 0
    setDateIndex(idx)
  }, [data?.previousMatches?.length, data?.currentMatch?.id, data?.nextMatch?.id, data?.nextAfterCurrent?.id, currentDateItemIndex])
  // Al abrir la pestaña Fechas: mostrar "Fecha actual"
  useEffect(() => {
    if (activeSection === datesSectionIndex && currentDateItemIndex >= 0) setDateIndex(currentDateItemIndex)
  }, [activeSection, datesSectionIndex, currentDateItemIndex])

  // Resumen de goles y tarjetas por equipo para un partido jugado
  const goalsCardsByTeam = (match) => {
    if (!match?.home_team_id || (!match?.goals?.length && !match?.cards?.length)) return null
    const homeId = match.home_team_id
    const awayId = match.away_team_id
    const homeG = (match.goals || []).filter((g) => g.team_id === homeId).reduce((s, g) => s + (Number(g.goals) || 0), 0)
    const awayG = (match.goals || []).filter((g) => g.team_id === awayId).reduce((s, g) => s + (Number(g.goals) || 0), 0)
    const homeYellow = (match.cards || []).filter((c) => c.team_id === homeId && c.card_type === 'yellow').length
    const homeRed = (match.cards || []).filter((c) => c.team_id === homeId && c.card_type === 'red').length
    const homeGreen = (match.cards || []).filter((c) => c.team_id === homeId && c.card_type === 'green').length
    const awayYellow = (match.cards || []).filter((c) => c.team_id === awayId && c.card_type === 'yellow').length
    const awayRed = (match.cards || []).filter((c) => c.team_id === awayId && c.card_type === 'red').length
    const awayGreen = (match.cards || []).filter((c) => c.team_id === awayId && c.card_type === 'green').length
    return {
      home: { name: match.home_team_name, goals: homeG, yellow: homeYellow, red: homeRed, green: homeGreen },
      away: { name: match.away_team_name, goals: awayG, yellow: awayYellow, red: awayRed, green: awayGreen },
    }
  }

  if (!teamId) return null

  return (
    <div className="league-page team-detail-slider">
      <Container className="py-3 py-md-4 px-3 px-sm-4">
        <div className="d-flex align-items-center gap-2 mb-3">
          <Button as={Link} variant="outline-secondary" size="sm" to={`/torneo/${tournamentId}`}>
            ← Volver al torneo
          </Button>
        </div>
        <TournamentLogo sport={tournament.sport} gender={tournament.gender} darkBg />
        <div className="league-header mb-4">
          <h1>{data?.team?.name ?? (isPadel ? 'Pareja' : 'Equipo')}</h1>
          <p className="subtitle mb-0 text-muted">
            {tournament.name || 'Liga'}
            {tournament.sport === 'futbol' && tournament.gender && ` · ${tournament.gender === 'masculino' ? 'Masculino' : tournament.gender === 'femenino' ? 'Femenino' : 'Mixto'}`}
            {' · '}{isPadel ? 'Integrantes y estadísticas de la pareja' : 'Jugadores y estadísticas del equipo'}
          </p>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>
        )}

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" /></div>
        ) : data ? (
          <>
            {/* Secciones arriba */}
            <Nav className="team-detail-sections mb-3" as="ul">
              {SECTIONS.map((s, i) => (
                <Nav.Item as="li" key={s.key}>
                  <button
                    type="button"
                    className={`nav-link ${activeSection === i ? 'active' : ''}`}
                    onClick={() => setActiveSection(i)}
                  >
                    <span className="section-icon">{s.icon}</span>
                    <span className="section-label">{s.label}</span>
                  </button>
                </Nav.Item>
              ))}
            </Nav>

            {/* Slider de contenido */}
            <div className="team-detail-slider-wrapper">
              <div className="team-detail-slider-track">
                <div
                  className="team-detail-slider-inner"
                  style={{ transform: `translateX(-${activeSection * 100}%)` }}
                >
                  {/* Slide: Jugadores/Integrantes */}
                  <div className="team-detail-slide" data-active={activeSection === 0}>
                    <Card className="team-detail-card-responsive">
                      <Card.Body className="p-0">
                        {!data.players?.length ? (
                          <div className="league-empty p-4">{isPadel ? 'Sin integrantes cargados.' : 'Sin jugadores cargados.'}</div>
                        ) : (
                          <>
                            <Table responsive hover className="mb-0 team-detail-table d-none d-sm-table">
                              <thead className="table-light">
                                <tr><th>Nombre</th><th>Nº camiseta</th><th>Rol</th>{!isPadel && <th>Estado</th>}</tr>
                              </thead>
                              <tbody>
                                {data.players.map((p) => {
                                  const pending = suspensionByPlayer[p.player_name]
                                  const suspended = pending != null && pending > 0
                                  return (
                                    <tr key={p.id} className={suspended ? 'table-warning' : ''}>
                                      <td>{p.player_name}</td>
                                      <td>{p.shirt_number ?? '—'}</td>
                                      <td>{roleLabel(p.role)}</td>
                                      {!isPadel && (
                                        <td>{suspended ? <span className="badge bg-warning text-dark">Suspendido ({pending} {pending === 1 ? 'fecha' : 'fechas'})</span> : <span className="badge bg-success">Activo</span>}</td>
                                      )}
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </Table>
                            <div className="team-detail-list d-sm-none">
                              {data.players.map((p) => {
                                const pending = suspensionByPlayer[p.player_name]
                                const suspended = pending != null && pending > 0
                                return (
                                  <div key={p.id} className={`team-detail-list-item ${suspended ? 'team-detail-list-item--suspended' : ''}`}>
                                    <span className="team-detail-list-label">Nombre</span>
                                    <span className="team-detail-list-value">{p.player_name}</span>
                                    <span className="team-detail-list-label">Nº camiseta</span>
                                    <span className="team-detail-list-value">{p.shirt_number ?? '—'}</span>
                                    <span className="team-detail-list-label">Rol</span>
                                    <span className="team-detail-list-value">{roleLabel(p.role)}</span>
                                    {!isPadel && (
                                      <>
                                        <span className="team-detail-list-label">Estado</span>
                                        <span className="team-detail-list-value">{suspended ? `Suspendido (${pending} ${pending === 1 ? 'fecha' : 'fechas'})` : 'Activo'}</span>
                                      </>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </>
                        )}
                      </Card.Body>
                    </Card>
                  </div>

                  {/* Slide: Goleadores (solo futbol/hockey) */}
                  {!isPadel && (
                  <div className="team-detail-slide" data-active={activeSection === 1}>
                    <Card className="team-detail-card-responsive">
                      <Card.Body className="p-0">
                        {!data.scorers?.length ? (
                          <div className="league-empty p-4">Sin goles cargados.</div>
                        ) : (
                          <>
                            <Table responsive hover className="mb-0 team-detail-table d-none d-sm-table">
                              <thead className="table-light">
                                <tr><th>#</th><th>Jugador</th><th>Goles</th></tr>
                              </thead>
                              <tbody>
                                {data.scorers.map((row) => (
                                  <tr key={`${row.player_name}-${row.team_id}`}>
                                    <td className="fw-semibold">{row.position}</td>
                                    <td>{row.player_name}</td>
                                    <td>{row.goals}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                            <div className="team-detail-list d-sm-none">
                              {data.scorers.map((row) => (
                                <div key={`${row.player_name}-${row.team_id}`} className="team-detail-list-item">
                                  <span className="team-detail-list-label">Posición</span>
                                  <span className="team-detail-list-value fw-semibold">{row.position}</span>
                                  <span className="team-detail-list-label">Jugadora</span>
                                  <span className="team-detail-list-value">{row.player_name}</span>
                                  <span className="team-detail-list-label">Goles</span>
                                  <span className="team-detail-list-value">{row.goals}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </Card.Body>
                    </Card>
                  </div>
                  )}

                  {/* Slide: Tarjetas (solo futbol/hockey) */}
                  {!isPadel && (
                  <div className="team-detail-slide" data-active={activeSection === 2}>
                    <Card className="team-detail-card-responsive">
                      <Card.Body className="p-0">
                        {!data.discipline?.length ? (
                          <div className="league-empty p-4">Sin tarjetas registradas.</div>
                        ) : (
                          <>
                            <Table responsive hover className="mb-0 team-detail-table d-none d-sm-table">
                              <thead className="table-light">
                                <tr>
                                  <th>Jugador</th>
                                  {isHockey && <th>Verdes</th>}
                                  <th>Amarillas</th><th>Rojas</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.discipline.map((row, i) => (
                                  <tr key={i}>
                                    <td>{row.player_name}</td>
                                    {isHockey && <td>{row.green ?? 0}</td>}
                                    <td>{row.yellow}</td>
                                    <td>{row.red}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                            <div className="team-detail-list d-sm-none">
                              {data.discipline.map((row, i) => (
                                <div key={i} className="team-detail-list-item">
                                  <span className="team-detail-list-label">Jugador</span>
                                  <span className="team-detail-list-value">{row.player_name}</span>
                                  {isHockey && <><span className="team-detail-list-label">Verdes</span><span className="team-detail-list-value">{row.green ?? 0}</span></>}
                                  <span className="team-detail-list-label">Amarillas</span>
                                  <span className="team-detail-list-value">{row.yellow}</span>
                                  <span className="team-detail-list-label">Rojas</span>
                                  <span className="team-detail-list-value">{row.red}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </Card.Body>
                    </Card>
                  </div>
                  )}

                  {/* Slide: Fechas (slider con anterior, actual, próxima; controles para deslizar) */}
                  <div className="team-detail-slide team-detail-slide-dates" data-active={activeSection === datesSectionIndex}>
                    <div className="team-detail-dates-slider">
                      {dateItems.length === 0 ? (
                        <Card>
                          <Card.Body className="text-muted p-4">Aún no hay partidos cargados para {isPadel ? 'esta pareja' : 'este equipo'}.</Card.Body>
                        </Card>
                      ) : (
                        <>
                          <div className="team-detail-dates-track">
                            <div
                              className="team-detail-dates-inner"
                              style={{ transform: `translateX(-${safeDateIndex * 100}%)` }}
                            >
                              {dateItems.map((item) => {
                                const detail = goalsCardsByTeam(item.match)
                                const isPlayed = item.match.status === 'played'
                                return (
                                  <div key={item.match.id} className="team-detail-date-card-wrap">
                                    <Card className={`team-detail-date-card ${item.type === 'current' ? 'border-primary' : ''}`}>
                                      <Card.Body className="team-detail-date-card-body">
                                        <h6 className="team-detail-date-card-title text-muted mb-2">
                                          {item.label}
                                        </h6>
                                        {isPlayed ? (
                                          <>
                                            <p className="team-detail-date-card-rival mb-1">
                                              <strong>vs {item.match.rival_name}</strong>
                                              {item.match.is_home ? ' (en casa)' : ' (visitante)'}
                                            </p>
                                            <p className="team-detail-date-card-score mb-2">
                                              Resultado: <strong>{item.match.home_score ?? 0} - {item.match.away_score ?? 0}</strong>
                                              <span className="text-muted small ms-2">Fecha {item.match.matchday_number}</span>
                                            </p>
                                            {detail && (
                                              <div className="team-detail-date-detail small mt-2 pt-2 border-top">
                                                <p className="mb-1"><strong>Goles por equipo:</strong></p>
                                                <p className="mb-1 text-muted mb-2">{detail.home.name}: {detail.home.goals} — {detail.away.name}: {detail.away.goals}</p>
                                                <p className="mb-1"><strong>Tarjetas por equipo:</strong></p>
                                                <p className="mb-0 text-muted">{detail.home.name}: {isHockey && `🟩 ${detail.home.green ?? 0} `}🟨 {detail.home.yellow} 🟥 {detail.home.red} — {detail.away.name}: {isHockey && `🟩 ${detail.away.green ?? 0} `}🟨 {detail.away.yellow} 🟥 {detail.away.red}</p>
                                              </div>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            <p className="team-detail-date-card-rival mb-1">
                                              <strong>Rival:</strong> {item.match.rival_name}
                                              {item.match.is_home ? ' (en casa)' : ' (visitante)'}
                                            </p>
                                            <p className="team-detail-date-card-meta mb-0 text-muted small">
                                              Fecha {item.match.matchday_number} · {item.match.played_at ? formatMatchDateTimeArgentina(item.match.played_at) : 'Por definir'}
                                            </p>
                                          </>
                                        )}
                                      </Card.Body>
                                    </Card>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                          <div className="team-detail-dates-nav">
                            <button
                              type="button"
                              className="team-detail-dates-nav-btn"
                              onClick={() => setDateIndex((i) => Math.max(0, i - 1))}
                              disabled={safeDateIndex <= 0}
                              aria-label="Fecha anterior"
                            >
                              ←
                            </button>
                            <div className="team-detail-dates-dots">
                              {dateItems.map((item, i) => (
                                <button
                                  key={item.match.id}
                                  type="button"
                                  className={`team-detail-dates-dot ${i === safeDateIndex ? 'active' : ''}`}
                                  onClick={() => setDateIndex(i)}
                                  aria-label={item.label}
                                  aria-current={i === safeDateIndex ? 'true' : undefined}
                                />
                              ))}
                            </div>
                            <button
                              type="button"
                              className="team-detail-dates-nav-btn"
                              onClick={() => setDateIndex((i) => Math.min(dateItems.length - 1, i + 1))}
                              disabled={safeDateIndex >= dateItems.length - 1}
                              aria-label="Siguiente fecha"
                            >
                              →
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </Container>
    </div>
  )
}
