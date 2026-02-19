import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Container, Card, Spinner, Alert, ListGroup, Table, Button } from 'react-bootstrap'
import * as api from '../api/league'
import TeamDetail from './TeamDetail'
import '../styles/League.css'

export default function LeagueView({ tournamentId, tournament = {}, teamId }) {
  const [teams, setTeams] = useState([])
  const [zones, setZones] = useState([])
  const [standingsByZone, setStandingsByZone] = useState({})
  const [scorersByZone, setScorersByZone] = useState({})
  const [activeZoneId, setActiveZoneId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [playoffBracket, setPlayoffBracket] = useState([])

  useEffect(() => {
    if (!tournamentId) return
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
  }, [tournamentId])

  // Sin zonas: datos globales. Con zonas: tabla y goleadores por cada zona (todo por zona)
  useEffect(() => {
    if (!tournamentId) return
    api.getTeams(tournamentId)
      .then((t) => setTeams(t || []))
      .catch((e) => setError(e.message))

    if (zones.length === 0) {
      Promise.all([
        api.getStandings(tournamentId),
        api.getScorers(tournamentId),
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
          api.getScorers(tournamentId, { zoneId: z.id }),
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
  }, [tournamentId, zones])

  // Formato Liga: sin playoffs; solo se pide bracket en formato "Fase de Grupos"
  useEffect(() => {
    if (!tournamentId) return
    if (tournament?.modality === 'liga') {
      setPlayoffBracket([])
      return
    }
    api.getPlayoffBracket(tournamentId)
      .then((bracket) => setPlayoffBracket(Array.isArray(bracket) ? bracket : []))
      .catch(() => setPlayoffBracket([]))
  }, [tournamentId, tournament?.modality])

  // Si hay teamId, mostrar detalle del equipo
  if (teamId) {
    return <TeamDetail tournamentId={tournamentId} tournament={tournament} />
  }

  const ZoneFilter = () =>
    zones.length > 0 ? (
      <Card className="mb-4 league-zone-filter">
        <Card.Body className="py-3 px-4">
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

  return (
    <div className="league-page">
      <Container className="league-page-container py-4 py-lg-5">
        <div className="league-header mb-4">
          <h1>{tournament.name || 'Liga'}</h1>
          <p className="subtitle mb-0">
            {tournament.sport === 'futbol' ? 'Fútbol' : tournament.sport === 'hockey' ? 'Hockey' : 'Pádel'}
            {tournament.status === 'active' ? ' · Activo' : tournament.status === 'finished' ? ' · Finalizado' : ''}
          </p>
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

            {/* 2. Tabla de ranking (por zona si hay zonas) */}
            <Card className="mb-4">
              <Card.Header className="fw-bold">
                Tabla de posiciones
                {zones.length > 0 && effectiveZoneId && (
                  <span className="text-muted fw-normal ms-2">— {zones.find((z) => z.id === effectiveZoneId)?.name}</span>
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

            {/* 3. Tabla de goleadores (solo futbol/hockey; padel no tiene) */}
            {!isPadel && (
            <Card className="mb-4">
              <Card.Header className="fw-bold">
                Goleadores
                {zones.length > 0 && effectiveZoneId && (
                  <span className="text-muted fw-normal ms-2">— {zones.find((z) => z.id === effectiveZoneId)?.name}</span>
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
            )}

            {/* Playoffs: solo en formato Fase de Grupos; formato Liga no tiene fase eliminatoria */}
            {tournament?.modality !== 'liga' && playoffBracket.length > 0 && (
              <Card className="mb-4">
                <Card.Header className="fw-bold">Playoffs</Card.Header>
                <Card.Body className="p-0">
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
                  <span className="text-muted fw-normal ms-2">({zones.find((z) => z.id === effectiveZoneId)?.name})</span>
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
                        className="d-flex align-items-center"
                      >
                        {t.shield_url && (
                          <img src={t.shield_url} alt="" className="me-3" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                        )}
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
