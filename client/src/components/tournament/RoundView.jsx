import { useState, useMemo } from 'react'
import { Tabs, Tab, Table, Card, Button, Alert, Spinner, Badge } from 'react-bootstrap'
import MatchCard from './MatchCard'
import PlayerCard from './PlayerCard'

function computeTotalRanking(players, dateData, numCourts) {
  const safePlayers = (players || []).filter((p) => p != null && p.id != null)
  if (!safePlayers.length) return { byCourt: {}, global: [] }
  const global = [...safePlayers].sort((a, b) => {
    const aSets = a.totalSets ?? 0
    const bSets = b.totalSets ?? 0
    if (bSets !== aSets) return bSets - aSets
    return (b.totalGames ?? 0) - (a.totalGames ?? 0)
  }).map((p, i) => ({ ...p, globalPosition: i + 1 }))

  const byCourt = {}
  if (dateData?.courtAssignments) {
    const idToPlayer = Object.fromEntries(safePlayers.map((p) => [p.id, p]))
    dateData.courtAssignments.forEach((courtIds, c) => {
      byCourt[c] = courtIds
        .map((id) => idToPlayer[id])
        .filter(Boolean)
        .sort((a, b) => {
          const aSets = a.totalSets ?? 0
          const bSets = b.totalSets ?? 0
          if (bSets !== aSets) return bSets - aSets
          return (b.totalGames ?? 0) - (a.totalGames ?? 0)
        })
        .map((p, i) => ({ ...p, positionInCourt: i + 1 }))
    })
  }
  return { byCourt, global }
}

export default function RoundView({
  tournamentId,
  state,
  dateData,
  viewingDate,
  onRefresh,
  onGenerateMatches,
  onCompleteDate,
  onNextDate,
  canCompleteDate,
  loadingDateAction,
  readOnly = false,
}) {
  const dateLabel = viewingDate != null ? viewingDate : state?.currentDate
  const isViewingCurrentDate = (viewingDate ?? state?.currentDate) === state?.currentDate
  const [activeTab, setActiveTab] = useState('total')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [showPlayerCard, setShowPlayerCard] = useState(false)

  const totalRanking = useMemo(() => {
    const players = (state?.players || []).filter((p) => p != null && p.id != null)
    if (!players.length || !state?.config) return { byCourt: {}, global: [] }
    return computeTotalRanking(players, dateData, state.config.numCourts)
  }, [state?.players, state?.config, dateData])

  // Ranking de esta fecha solo (registro): al ver una fecha pasada/completada, usar snapshot
  const dateOnlyRanking = useMemo(() => {
    if (!dateData?.rankingAtEnd?.byCourt) return null
    const byCourt = dateData.rankingAtEnd.byCourt
    if (dateData.rankingAtEnd.global && dateData.rankingAtEnd.global.length > 0) {
      return { byCourt, global: dateData.rankingAtEnd.global }
    }
    const all = []
    Object.values(byCourt).forEach((arr) => arr.forEach((p) => all.push({ ...p })))
    const global = [...all].sort((a, b) => {
      const aS = a.setsWonInDate ?? 0
      const bS = b.setsWonInDate ?? 0
      if (bS !== aS) return bS - aS
      return (b.gamesInDate ?? 0) - (a.gamesInDate ?? 0)
    }).map((p, i) => ({ ...p, globalPosition: i + 1 }))
    return { byCourt, global }
  }, [dateData?.rankingAtEnd])

  // Por cancha: ranking con sets/games de ESTA FECHA (0 al iniciar nueva fecha). Si es fecha pasada, usar snapshot.
  const courtRankingThisDate = useMemo(() => {
    const numCourts = state?.config?.numCourts ?? 0
    const out = {}
    if (dateData?.completed && dateOnlyRanking?.byCourt) {
      for (let c = 0; c < numCourts; c++) out[c] = dateOnlyRanking.byCourt[c] || []
      return out
    }
    const players = state?.players || []
    for (let c = 0; c < numCourts; c++) {
      const courtPlayers = players
        .filter((p) => p != null && p.courtIndex === c)
        .map((p) => ({ ...p }))
        .sort((a, b) => {
          if ((b.setsWonInDate ?? 0) !== (a.setsWonInDate ?? 0)) return (b.setsWonInDate ?? 0) - (a.setsWonInDate ?? 0)
          return (b.gamesInDate ?? 0) - (a.gamesInDate ?? 0)
        })
        .map((p, i) => ({ ...p, positionInCourt: i + 1 }))
      out[c] = courtPlayers
    }
    return out
  }, [state?.players, state?.config?.numCourts, dateData?.completed, dateOnlyRanking?.byCourt])

  const allMatches = useMemo(() => dateData?.matches ?? [], [dateData?.matches])

  const matchesByCourt = useMemo(() => {
    const byCourt = {}
    allMatches.forEach((m) => {
      const c = m.courtIndex
      if (!byCourt[c]) byCourt[c] = []
      byCourt[c].push(m)
    })
    return byCourt
  }, [allMatches])

  function getPlayersWhoNeedRest(m) {
    if (!dateData?.completedMatchOrder?.length || m.completed) return []
    const playerIds = [...(m.pair1 || []), ...(m.pair2 || [])]
    const order = dateData.completedMatchOrder
    const matches = dateData.matches || []
    const getMatchById = (id) => matches.find((x) => x.id === id)
    const needRest = []
    for (const pid of playerIds) {
      let lastIndex = -1
      for (let i = order.length - 1; i >= 0; i--) {
        const mat = getMatchById(order[i])
        if (mat && [...(mat.pair1 || []), ...(mat.pair2 || [])].includes(pid)) {
          lastIndex = i
          break
        }
      }
      if (lastIndex === order.length - 1) {
        const pl = state.players.find((x) => x.id === pid)
        if (pl) needRest.push(pl.name)
      }
    }
    return needRest
  }

  const openPlayerCard = (player) => {
    setSelectedPlayer(player)
    setShowPlayerCard(true)
  }

  const restNamesByCourt = useMemo(() => {
    if (!dateData?.restByCourt || !state?.players?.length) return {}
    const idToName = Object.fromEntries(state.players.map((p) => [p.id, p.name]))
    const out = {}
    dateData.restByCourt.forEach((ids, c) => {
      out[c] = (ids || []).map((id) => idToName[id] || id).filter(Boolean)
    })
    return out
  }, [dateData?.restByCourt, state?.players])

  if (!dateData) return null

  const qualifyingDates = state.config?.qualifyingDates ?? 1
  const isQualifyingPhase = dateLabel < qualifyingDates
  const dateJustCompletedQualifying = dateData?.isQualifying === true

  return (
    <>
      <Card className="mb-3 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span className="fw-bold">Fecha {dateLabel}</span>
          <span className="d-flex align-items-center gap-2 flex-wrap">
            {isQualifyingPhase ? (
              <Badge bg="warning" text="dark">Fase clasificatoria (1–{qualifyingDates})</Badge>
            ) : (
              <Badge bg="success">Escalera activa</Badge>
            )}
            {!readOnly && isViewingCurrentDate && onGenerateMatches && (allMatches.length === 0) && (
              <Button
                variant="primary"
                size="sm"
                onClick={onGenerateMatches}
                disabled={loadingDateAction}
              >
                {loadingDateAction ? <Spinner animation="border" size="sm" /> : 'Generar partidos'}
              </Button>
            )}
          </span>
        </Card.Header>
        <Card.Body className="py-2 bg-light small">
          {isQualifyingPhase
            ? `Fechas 1 a ${qualifyingDates}: clasificatorias. No hay movimientos de cancha hasta terminar la fecha ${qualifyingDates}; después se aplica la escalera. `
            : ''}
          En cada cancha descansan 4 jugadores por fecha (un bloque); la rotación se repite según la cantidad de bloques por cancha.
        </Card.Body>
      </Card>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
        <Tab eventKey="total" title="Total">
          {dateData.completed && dateOnlyRanking?.global?.length > 0 && (
            <Card className="mb-3 border-secondary">
              <Card.Header className="bg-light">Ranking al cierre de Fecha {dateLabel} (registro de esta fecha)</Card.Header>
              <Card.Body className="p-0">
                <Table responsive hover size="sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Jugador</th>
                      <th>Cancha</th>
                      <th>Partidos</th>
                      <th>Sets</th>
                      <th>Games</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateOnlyRanking.global.map((p) => (
                      <tr
                        key={p.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => openPlayerCard(state.players.find((x) => x.id === p.id) ?? p)}
                      >
                        <td>{p.globalPosition}</td>
                        <td>{p.name}</td>
                        <td>{p.courtIndex != null ? p.courtIndex + 1 : '—'}</td>
                        <td>{p.matchesPlayedInDate ?? 0}</td>
                        <td>{p.setsWonInDate ?? 0}</td>
                        <td>{p.gamesInDate ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}
          <Card className="mb-3">
            <Card.Header>Ranking general (suma de todas las fechas)</Card.Header>
            <Card.Body className="p-0">
              <Table responsive hover size="sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Jugador</th>
                    <th>Cancha</th>
                    <th>Partidos</th>
                    <th>Sets</th>
                    <th>Games</th>
                  </tr>
                </thead>
                <tbody>
                  {totalRanking.global.map((p) => (
                    <tr
                      key={p.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openPlayerCard(p)}
                    >
                      <td>{p.globalPosition}</td>
                      <td>{p.name}</td>
                      <td>{p.courtIndex != null ? p.courtIndex + 1 : '—'}</td>
                      <td>{p.totalMatches ?? 0}</td>
                      <td>{p.totalSets ?? 0}</td>
                      <td>{p.totalGames ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
          <h6 className="mb-2">Partidos por cancha</h6>
          {Array.from({ length: state.config?.numCourts ?? 0 }, (_, c) => (
            <Card key={c} className="mb-3">
              <Card.Header>Cancha {c + 1}</Card.Header>
              <Card.Body>
                {(matchesByCourt[c] ?? matchesByCourt[String(c)] ?? []).length === 0 ? (
                  <p className="text-muted small mb-0">Sin partidos en esta cancha para esta fecha.</p>
                ) : (
                  (matchesByCourt[c] ?? matchesByCourt[String(c)] ?? []).map((m) => (
                    <MatchCard
                      key={m.id}
                      tournamentId={tournamentId}
                      match={m}
                      players={state.players}
                      onUpdate={onRefresh}
                      playersNeedRest={getPlayersWhoNeedRest(m)}
                      readOnly={readOnly}
                    />
                  ))
                )}
              </Card.Body>
            </Card>
          ))}
        </Tab>
        {dateData?.movements?.length > 0 && (
          <Tab eventKey="movimientos" title="Quién sube y baja">
            <Card className="mb-3 border-primary">
              <Card.Header className="bg-primary text-white d-flex align-items-center justify-content-between flex-wrap gap-2">
                <span>Movimientos de cancha — Fecha {dateLabel}</span>
                {dateJustCompletedQualifying && (
                  <Badge bg="warning" text="dark">Clasificatoria: no se aplicaron movimientos</Badge>
                )}
              </Card.Header>
              <Card.Body>
                {dateJustCompletedQualifying ? (
                  <Alert variant="info" className="small mb-3">
                    En las primeras {qualifyingDates} fechas no se mueve a nadie de cancha. A partir de la fecha {qualifyingDates + 1} se aplicará la escalera (suben 2, bajan 2).
                  </Alert>
                ) : (
                  <p className="text-muted small mb-3">
                    Suben 2 y bajan 2 por cancha (posiciones 1-2 y últimas 2).
                  </p>
                )}
                <Table responsive bordered size="sm">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '120px' }}>Cancha</th>
                      <th>Suben (2)</th>
                      <th>Bajan (2)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateData.movements.map((m) => {
                      const idToName = (id) => state.players.find((p) => p.id === id)?.name || id
                      const upNames = (m.up || []).map(idToName).filter(Boolean)
                      const downNames = (m.down || []).map(idToName).filter(Boolean)
                      return (
                        <tr key={m.courtIndex}>
                          <td className="fw-bold">Cancha {m.courtIndex + 1}</td>
                          <td className="text-success">{upNames.join(', ') || '—'}</td>
                          <td className="text-danger">{downNames.join(', ') || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab>
        )}
        {Array.from({ length: state.config.numCourts }, (_, c) => (
          <Tab key={c} eventKey={`court-${c}`} title={`Cancha ${c + 1}`}>
            {(restNamesByCourt[c] || []).length > 0 && (
              <Alert variant="info" className="py-2 small mb-2">
                <strong>Descansan esta fecha:</strong> {(restNamesByCourt[c] || []).join(', ')}
              </Alert>
            )}
            <Card className="mb-3">
              <Card.Header>Cancha {c + 1} — {(courtRankingThisDate[c] || []).length} jugadores (esta fecha)</Card.Header>
              <Card.Body className="p-0">
                <Table responsive hover size="sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Jugador</th>
                      <th>Partidos</th>
                      <th>Sets</th>
                      <th>Games</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(courtRankingThisDate[c] || []).map((p) => (
                      <tr
                        key={p.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => openPlayerCard(state.players.find((x) => x.id === p.id) ?? p)}
                      >
                        <td>{p.positionInCourt}</td>
                        <td>{p.name}</td>
                        <td>{p.matchesPlayedInDate ?? 0}</td>
                        <td>{p.setsWonInDate ?? 0}</td>
                        <td>{p.gamesInDate ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
            <h6 className="mb-2">Partidos en esta cancha</h6>
            {(matchesByCourt[c] || []).map((m) => (
              <MatchCard
                key={m.id}
                tournamentId={tournamentId}
                match={m}
                players={state.players}
                onUpdate={onRefresh}
                playersNeedRest={getPlayersWhoNeedRest(m)}
                readOnly={readOnly}
              />
            ))}
          </Tab>
        ))}
      </Tabs>

      {!readOnly && state.status === 'date' && isViewingCurrentDate && (
        <Card className="border-primary">
          <Card.Body>
            {canCompleteDate ? (
              <>
                <Alert variant="success" className="mb-2">
                  Todos los partidos de la fecha están finalizados. Podés cerrar la fecha para actualizar el ranking.
                </Alert>
                <Button
                  variant="primary"
                  onClick={onCompleteDate}
                  disabled={loadingDateAction}
                >
                  {loadingDateAction ? <Spinner animation="border" size="sm" /> : 'Finalizar fecha'}
                </Button>
              </>
            ) : (
              <p className="text-muted mb-0">
                Completá todos los partidos (3 por cancha) para poder finalizar la fecha.
              </p>
            )}
          </Card.Body>
        </Card>
      )}

      {!readOnly && state.status === 'date_complete' && isViewingCurrentDate && (
        <Card className="border-success">
          <Card.Body>
            <Alert variant="success" className="mb-2">
              Fecha {dateLabel} finalizada. Ranking actualizado.
            </Alert>
            <Button
              variant="success"
              onClick={onNextDate}
              disabled={loadingDateAction}
            >
              {loadingDateAction ? <Spinner animation="border" size="sm" /> : 'Iniciar siguiente fecha'}
            </Button>
          </Card.Body>
        </Card>
      )}

      <PlayerCard
        player={selectedPlayer}
        show={showPlayerCard}
        onHide={() => setShowPlayerCard(false)}
      />
    </>
  )
}
