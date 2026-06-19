import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Container, Card, Spinner, Alert, ListGroup, Table, Button, Row, Col } from 'react-bootstrap'
import * as api from '../api/league'
import TeamDetail from './TeamDetail'
import TournamentLogo from '../components/tournament/TournamentLogo'
import TeamShield from '../components/league/TeamShield'
import { isLeagueFormat } from '../utils/tournamentFormat'
import { reglamentoPublicHref } from '../utils/reglamentoUrl'
import { formatMatchDateTimeArgentina } from '../utils/matchDateTime'
import '../styles/League.css'

const SPORTSREEL_COMPLEJO_ARENA_URL = 'https://sportsreel.com.ar/#/complejo/Complejo%20Arena'

export default function LeagueView({ tournamentId, tournament = {}, teamId }) {
  const isLeague = isLeagueFormat(tournament)
  const [teams, setTeams] = useState([])
  const [zones, setZones] = useState([])
  const [standingsByZone, setStandingsByZone] = useState({})
  const [scorersByZone, setScorersByZone] = useState({})
  const [activeZoneId, setActiveZoneId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [playoffBracket, setPlayoffBracket] = useState([])
  const [phaseFinalStandings, setPhaseFinalStandings] = useState({ upper: [], lower: [] })
  const [currentMatchday, setCurrentMatchday] = useState(null)
  const [currentMatchdayMatches, setCurrentMatchdayMatches] = useState([])

  useEffect(() => {
    if (!tournamentId) return
    if (!isLeague) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    api.getZones(tournamentId)
      .then((zonesData) => {
        const z = zonesData || []
        setZones(z)
        if (z.length > 0) setActiveZoneId((prev) => prev || z[0].id)
        return z
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [tournamentId, isLeague])

  // Sin zonas: datos globales. Con zonas: tabla y goleadores por cada zona (todo por zona)
  useEffect(() => {
    if (!tournamentId || !isLeague) return
    api.getTeams(tournamentId)
      .then((t) => setTeams(t || []))
      .catch((e) => setError(e.message))

    if (zones.length === 0) {
      Promise.all([
        api.getStandings(tournamentId),
        api.getScorers(tournamentId, { limit: 10 }),
      ])
        .then(([standings, scorers]) => {
          setStandingsByZone({ _single: standings || [] })
          setScorersByZone({ _single: scorers || [] })
        })
        .catch((e) => setError(e.message))
    } else {
      Promise.all(zones.map((z) =>
        Promise.all([
          api.getStandings(tournamentId, { zoneId: z.id }),
          api.getScorers(tournamentId, { zoneId: z.id, limit: 10 }),
        ]).then(([standings, scorers]) => ({ zoneId: z.id, standings: standings || [], scorers: scorers || [] }))
      ))
        .then((results) => {
          const nextStandings = {}
          const nextScorers = {}
          results.forEach((r) => {
            nextStandings[r.zoneId] = r.standings
            nextScorers[r.zoneId] = r.scorers
          })
          setStandingsByZone(nextStandings)
          setScorersByZone(nextScorers)
        })
        .catch((e) => setError(e.message))
    }
  }, [tournamentId, zones, isLeague])

  useEffect(() => {
    if (!tournamentId || !isLeague) return
    api.getCurrentMatchday(tournamentId)
      .then((md) => setCurrentMatchday(md || null))
      .catch(() => setCurrentMatchday(null))
  }, [tournamentId, isLeague])

  useEffect(() => {
    if (!tournamentId || !isLeague || !currentMatchday?.id) {
      setCurrentMatchdayMatches([])
      return
    }
    const zoneId = zones.length > 0 ? (activeZoneId || zones[0]?.id) : null
    api.getMatches(tournamentId, currentMatchday.id, zoneId ? { zoneId } : {})
      .then((matches) => setCurrentMatchdayMatches(matches || []))
      .catch(() => setCurrentMatchdayMatches([]))
  }, [tournamentId, isLeague, currentMatchday?.id, activeZoneId, zones])

  useEffect(() => {
    if (!tournamentId || !isLeague) return
    api.getPlayoffBracket(tournamentId)
      .then((bracket) => {
        const b = Array.isArray(bracket) ? bracket : []
        setPlayoffBracket(b)
        if (b.length > 0 && b.some((r) => r.phase_final_group)) {
          Promise.all([
            api.getStandings(tournamentId, { phase_final_group: 'upper' }),
            api.getStandings(tournamentId, { phase_final_group: 'lower' }),
          ]).then(([upper, lower]) => setPhaseFinalStandings({ upper: upper || [], lower: lower || [] })).catch(() => {})
        } else {
          setPhaseFinalStandings({ upper: [], lower: [] })
        }
      })
      .catch(() => setPlayoffBracket([]))
  }, [tournamentId, isLeague])

  // Si no es torneo de liga, no llamar APIs (evita 400 por inconsistencia de datos)
  if (tournamentId && tournament.sport && !isLeague) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          Este torneo no usa formato de liga. <Link to="/">Volver al inicio</Link>
        </Alert>
      </Container>
    )
  }

  // Si hay teamId, mostrar detalle del equipo
  if (teamId) {
    return <TeamDetail tournamentId={tournamentId} tournament={tournament} />
  }

  const ZoneFilter = () =>
    zones.length > 0 ? (
      <Card className="mb-4 league-zone-filter">
        <Card.Body className="py-3 px-3 px-sm-4">
          <span className="text-muted small me-2 fw-medium">{zoneLabel}:</span>
          {zones.map((z) => (
            <Button
              key={z.id}
              variant={(activeZoneId || zones[0]?.id) === z.id ? 'primary' : 'outline-secondary'}
              size="sm"
              className="me-2 mb-1"
              onClick={() => setActiveZoneId(z.id)}
            >
              {z.name}
            </Button>
          ))}
        </Card.Body>
      </Card>
    ) : null

  const effectiveZoneId = zones.length > 0 ? (activeZoneId || zones[0]?.id) : null
  const standings = zones.length > 0 && effectiveZoneId ? standingsByZone[effectiveZoneId] ?? [] : standingsByZone._single ?? []
  const scorers = zones.length > 0 && effectiveZoneId ? scorersByZone[effectiveZoneId] ?? [] : scorersByZone._single ?? []
  const teamsToShow = zones.length > 0 && effectiveZoneId ? teams.filter((t) => t.zone_id === effectiveZoneId) : teams

  const isPadel = tournament.sport === 'padel'
  const teamLabel = isPadel ? 'Pareja' : 'Equipo'
  const teamsLabel = isPadel ? 'Parejas' : 'Equipos'
  const zoneLabel = isPadel ? 'Grupo' : 'Zona'
  const colSF = isPadel ? 'SF' : 'GF'
  const colSC = isPadel ? 'SC' : 'GC'
  const colDG = isPadel ? 'DS' : 'DG'

  const formatFechaMatchScore = (m) => {
    if (m.status !== 'played') return null
    const sets = `${m.home_score ?? 0} - ${m.away_score ?? 0}`
    if (isPadel && (m.home_games != null || m.away_games != null)) {
      return `${sets} (${m.home_games ?? 0}-${m.away_games ?? 0} games)`
    }
    return sets
  }

  return (
    <div className="league-page">
      <Container className="league-page-container py-3 py-md-4 py-lg-5">
        <TournamentLogo sport={tournament.sport} gender={tournament.gender} darkBg />
        <div className="league-header mb-4">
          <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-start justify-content-between gap-2 gap-sm-3">
            <div className="min-w-0 flex-grow-1">
              <h1>{tournament.name || 'Liga'}</h1>
              <p className="subtitle mb-0">
                {tournament.sport === 'futbol' ? 'Fútbol' : tournament.sport === 'hockey' ? 'Hockey' : 'Pádel'}
                {tournament.sport === 'futbol' && tournament.gender && ` · ${tournament.gender === 'masculino' ? 'Masculino' : tournament.gender === 'femenino' ? 'Femenino' : 'Mixto'}`}
                {tournament.status === 'active' ? ' · Activo' : tournament.status === 'finished' ? ' · Finalizado' : ''}
              </p>
            </div>
            {(tournament.reglamento_url || tournament.sport === 'futbol' || tournament.sport === 'hockey') && (
              <div className="d-flex flex-shrink-0 align-self-start gap-2 flex-wrap justify-content-end">
                {tournament.reglamento_url && (
                  <Button
                    as="a"
                    variant="outline-primary"
                    size="sm"
                    className="league-header-reglamento-btn"
                    href={reglamentoPublicHref(tournament.reglamento_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Reglamento
                  </Button>
                )}
                {(tournament.sport === 'futbol' || tournament.sport === 'hockey') && (
                  <Button
                    as="a"
                    variant="outline-primary"
                    size="sm"
                    className="league-header-reglamento-btn"
                    href={SPORTSREEL_COMPLEJO_ARENA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Revivi tu partido
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>
        )}

        {/* 1. Descripción al principio */}
        {tournament.rules && (
          <Card className="mb-4">
            <Card.Header className="fw-bold">Descripción del torneo</Card.Header>
            <Card.Body className="white-space-pre-wrap small text-muted">{tournament.rules}</Card.Body>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" /></div>
        ) : (
          <>
            <ZoneFilter />

            <div className="league-pre-standings mb-4">
              <Row className="g-3">
                {currentMatchday?.number != null && (
                  <Col xs={12} lg={isPadel ? 12 : 7}>
                    <Card className="h-100 league-current-matchday-card mb-0">
                      <Card.Header className="fw-bold">
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <span>{tournament.status === 'finished' ? 'Última fecha' : 'Fecha actual'}</span>
                          <span className="league-current-matchday__value">Fecha {currentMatchday.number}</span>
                          {zones.length > 0 && effectiveZoneId && (
                            <span className="league-card-header-zone fw-normal ms-sm-auto small">
                              {zones.find((z) => z.id === effectiveZoneId)?.name}
                            </span>
                          )}
                        </div>
                        {tournament.status !== 'finished' && (
                          <p className="league-current-matchday__hint mb-0 mt-2 fw-normal">
                            Se determina según el calendario programado, no por la carga de resultados.
                          </p>
                        )}
                      </Card.Header>
                      <Card.Body className="p-0">
                        {currentMatchdayMatches.length === 0 ? (
                          <div className="league-empty p-3 text-muted small mb-0">Sin partidos en esta fecha.</div>
                        ) : (
                          <ListGroup variant="flush">
                            {currentMatchdayMatches.map((m) => {
                              const played = m.status === 'played'
                              const score = formatFechaMatchScore(m)
                              return (
                                <ListGroup.Item key={m.id} className="league-fecha-match">
                                  <div className="league-fecha-match__row">
                                    <div className="league-fecha-match__team league-fecha-match__team--home">
                                      <TeamShield url={m.home_shield} name={m.home_team_name} size={36} />
                                      <span className="league-fecha-match__name">{m.home_team_name}</span>
                                    </div>
                                    <div className={`league-fecha-match__score${played ? ' league-fecha-match__score--played' : ''}`}>
                                      {played ? score : 'vs'}
                                    </div>
                                    <div className="league-fecha-match__team league-fecha-match__team--away">
                                      <TeamShield url={m.away_shield} name={m.away_team_name} size={36} />
                                      <span className="league-fecha-match__name">{m.away_team_name}</span>
                                    </div>
                                  </div>
                                  {m.played_at && (
                                    <div className="league-fecha-match__meta text-muted small">
                                      {formatMatchDateTimeArgentina(m.played_at)}
                                    </div>
                                  )}
                                </ListGroup.Item>
                              )
                            })}
                          </ListGroup>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                )}

                {!isPadel && (
                  <Col xs={12} lg={currentMatchday?.number != null ? 5 : 12}>
                    <Card className="h-100 mb-0">
                      <Card.Header className="fw-bold">
                        Goleadores — Top 10
                        {zones.length > 0 && effectiveZoneId && (
                          <span className="league-card-header-zone fw-normal ms-2">— {zones.find((z) => z.id === effectiveZoneId)?.name}</span>
                        )}
                      </Card.Header>
                      <Card.Body className="p-0">
                        {scorers.length === 0 ? (
                          <div className="league-empty p-4 text-muted">Sin goles cargados.</div>
                        ) : (
                          <Table responsive hover className="mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>#</th>
                                <th>Jugador</th>
                                <th>Equipo</th>
                                <th>Goles</th>
                              </tr>
                            </thead>
                            <tbody>
                              {scorers.map((row) => (
                                <tr key={`${row.player_name}-${row.team_id}`}>
                                  <td className="fw-semibold">{row.position}</td>
                                  <td>{row.player_name}</td>
                                  <td>{row.team_name}</td>
                                  <td>{row.goals}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                )}
              </Row>
            </div>

            {/* Tabla de ranking (por zona si hay zonas) */}
            <Card className="mb-4">
              <Card.Header className="fw-bold">
                Tabla de posiciones
                {zones.length > 0 && effectiveZoneId && (
                  <span className="league-card-header-zone fw-normal ms-2">— {zones.find((z) => z.id === effectiveZoneId)?.name}</span>
                )}
              </Card.Header>
              <Card.Body className="p-0">
                {standings.length === 0 ? (
                  <div className="league-empty p-4 text-muted">Aún no hay partidos jugados.</div>
                ) : (
                  <Table responsive hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>{teamLabel}</th>
                        <th>PJ</th>
                        <th>PG</th>
                        {!isPadel && <th>PE</th>}
                        <th>PP</th>
                        <th>{colSF}</th>
                        <th>{colSC}</th>
                        <th>{colDG}</th>
                        {isPadel && <><th>GF</th><th>GC</th><th>DG</th></>}
                        <th>Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row) => (
                        <tr key={row.team_id}>
                          <td className="fw-semibold">{row.position}</td>
                          <td>{row.team_name}</td>
                          <td>{row.played}</td>
                          <td>{row.won}</td>
                          {!isPadel && <td>{row.drawn}</td>}
                          <td>{row.lost}</td>
                          <td>{row.goals_for}</td>
                          <td>{row.goals_against}</td>
                          <td>{row.goal_diff}</td>
                          {isPadel && <>
                            <td>{row.games_for ?? 0}</td>
                            <td>{row.games_against ?? 0}</td>
                            <td>{row.games_diff ?? 0}</td>
                          </>}
                          <td className="fw-semibold">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>

            {/* Playoffs (Fase de Grupos) o Fase final mini-ligas (Liga) */}
            {playoffBracket.length > 0 && (
              <Card className="mb-4">
                <Card.Header className="fw-bold">{tournament?.modality === 'liga' ? 'Fase final' : 'Playoffs'}</Card.Header>
                <Card.Body className="p-0">
                  {playoffBracket.some((r) => r.phase_final_group) && (phaseFinalStandings.upper.length > 0 || phaseFinalStandings.lower.length > 0) && (
                    <div className="p-3 border-bottom">
                      <Row>
                        {phaseFinalStandings.upper.length > 0 && (
                          <Col md={6} className="mb-3 mb-md-0">
                            <h6 className="fw-semibold mb-2">Grupo A (mitad superior)</h6>
                            <Table size="sm" className="mb-0">
                              <thead className="table-light"><tr><th>#</th><th>{teamLabel}</th><th>Pts</th></tr></thead>
                              <tbody>
                                {phaseFinalStandings.upper.slice(0, 6).map((row) => (
                                  <tr key={row.team_id}><td>{row.position}</td><td>{row.team_name}</td><td>{row.points}</td></tr>
                                ))}
                              </tbody>
                            </Table>
                          </Col>
                        )}
                        {phaseFinalStandings.lower.length > 0 && (
                          <Col md={6}>
                            <h6 className="fw-semibold mb-2">Grupo B (mitad inferior)</h6>
                            <Table size="sm" className="mb-0">
                              <thead className="table-light"><tr><th>#</th><th>{teamLabel}</th><th>Pts</th></tr></thead>
                              <tbody>
                                {phaseFinalStandings.lower.slice(0, 6).map((row) => (
                                  <tr key={row.team_id}><td>{row.position}</td><td>{row.team_name}</td><td>{row.points}</td></tr>
                                ))}
                              </tbody>
                            </Table>
                          </Col>
                        )}
                      </Row>
                    </div>
                  )}
                  {playoffBracket.map((round) => (
                    <div key={round.id} className="border-bottom">
                      <div className="px-3 py-2 bg-light small fw-semibold">{round.name}</div>
                      <Table responsive className="mb-0">
                        <tbody>
                          {(round.matches || []).map((m) => (
                            <tr key={m.id}>
                              <td className="text-end py-2">{m.home_team_name || m.home_slot || '—'}</td>
                              <td className="text-center py-2 fw-semibold" style={{ width: 80 }}>
                                {m.status === 'played' ? `${m.home_score ?? 0} - ${m.away_score ?? 0}` : 'vs'}
                              </td>
                              <td className="py-2">{m.away_team_name || m.away_slot || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            )}

            {/* 4. Equipos/Parejas participantes (filtrados por zona si hay zonas) */}
            <Card>
              <Card.Header className="fw-bold">
                {teamsLabel} participantes
                {zones.length > 0 && effectiveZoneId && (
                  <span className="league-card-header-zone fw-normal ms-2">({zones.find((z) => z.id === effectiveZoneId)?.name})</span>
                )}
              </Card.Header>
              <Card.Body className="p-0">
                {!teamsToShow.length ? (
                  <div className="league-empty p-4 text-muted">Aún no hay {teamsLabel.toLowerCase()} cargad{isPadel ? 'as' : 'os'}.</div>
                ) : (
                  <ListGroup variant="flush">
                    {teamsToShow.map((t) => (
                      <ListGroup.Item
                        key={t.id}
                        action
                        as={Link}
                        to={`/torneo/${tournamentId}/equipo/${t.id}`}
                        className="d-flex align-items-center gap-3"
                      >
                        <TeamShield url={t.shield_url} name={t.name} size={36} />
                        <span className="fw-medium">{t.name}</span>
                        {t.zone_name && <span className="text-muted small ms-2">({t.zone_name})</span>}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </Card.Body>
            </Card>
          </>
        )}
      </Container>
    </div>
  )
}
