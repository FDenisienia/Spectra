import { useState, useEffect } from 'react'
import { Card, Row, Col, Form, Button, Badge, Alert } from 'react-bootstrap'
import { setMatchScore, completeMatch } from '../../api/tournament'

function PairNames({ pairIds, players }) {
  const names = (pairIds || []).map((id) => players.find((p) => p.id === id)?.name || id).filter(Boolean)
  return <span>{names.join(' / ')}</span>
}

export default function MatchCard({ tournamentId, match, players, onUpdate, playersNeedRest = [] }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [localSets, setLocalSets] = useState(
    (match.sets || []).map((s) => ({ p1: s.pair1Games, p2: s.pair2Games }))
  )

  // Solo sincronizar desde el servidor cuando el partido está finalizado, para no pisar
  // los datos que el usuario ya cargó en otros partidos al hacer refetch tras finalizar uno.
  useEffect(() => {
    if (match.completed && match.sets) {
      setLocalSets(match.sets.map((s) => ({ p1: s.pair1Games, p2: s.pair2Games })))
    }
  }, [match.completed, match.sets])

  const updateLocalSet = (setIndex, side, value) => {
    const v = parseInt(value, 10)
    if (isNaN(v) || v < 0) return
    const next = [...localSets]
    if (!next[setIndex]) next[setIndex] = { p1: 0, p2: 0 }
    next[setIndex] = { ...next[setIndex], [side]: v }
    setLocalSets(next)
  }

  const handleComplete = async () => {
    setError(null)
    if (playersNeedRest.length > 0) return
    setLoading(true)
    try {
      for (let setIndex = 0; setIndex < 3; setIndex++) {
        const s = localSets[setIndex] || { p1: 0, p2: 0 }
        await setMatchScore(tournamentId, match.id, setIndex, s.p1, s.p2)
      }
      await completeMatch(tournamentId, match.id)
      onUpdate()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (match.completed) {
    const sets = match.sets || []
    const [p1Sets, p2Sets] = sets.reduce(
      (acc, set) => {
        if (set.pair1Games > set.pair2Games) acc[0]++
        else if (set.pair2Games > set.pair1Games) acc[1]++
        return acc
      },
      [0, 0]
    )
    return (
      <Card className="mb-3 border-success">
        <Card.Body className="py-2">
          <Row className="align-items-center small">
            <Col>
              <PairNames pairIds={match.pair1} players={players} />
            </Col>
            <Col className="text-center">
              <Badge bg="secondary">
                {p1Sets} sets — {sets.reduce((s, x) => s + (x.pair1Games ?? 0), 0)} games
              </Badge>
              <span className="mx-2">vs</span>
              <Badge bg="secondary">
                {p2Sets} sets — {sets.reduce((s, x) => s + (x.pair2Games ?? 0), 0)} games
              </Badge>
            </Col>
            <Col className="text-end">
              <PairNames pairIds={match.pair2} players={players} />
            </Col>
          </Row>
          {sets.length > 0 && (
            <div className="text-center mt-2 text-muted small">
              <span className="me-2">Detalle sets:</span>
              {sets.map((set, i) => (
                <span key={i} className="me-2">
                  Set {i + 1}: <strong>{set.pair1Games ?? 0}</strong>-<strong>{set.pair2Games ?? 0}</strong>
                </span>
              ))}
            </div>
          )}
          <div className="text-center mt-1">
            <Badge bg="success">Partido finalizado</Badge>
          </div>
        </Card.Body>
      </Card>
    )
  }

  return (
    <Card className="mb-3">
      <Card.Body>
        <Row className="align-items-center mb-2">
          <Col>
            <strong><PairNames pairIds={match.pair1} players={players} /></strong>
          </Col>
          <Col className="text-center text-muted">vs</Col>
          <Col className="text-end">
            <strong><PairNames pairIds={match.pair2} players={players} /></strong>
          </Col>
        </Row>
        {error && (
          <Alert variant="warning" dismissible onClose={() => setError(null)} className="py-2 small">
            {error}
          </Alert>
        )}
        {playersNeedRest.length > 0 && (
          <Alert variant="info" className="py-2 small mb-2">
            <strong>Descanso:</strong> {playersNeedRest.join(', ')} acaban de jugar. Completá otro partido primero y después este.
          </Alert>
        )}
        <Row>
          {[0, 1, 2].map((setIndex) => (
            <Col key={setIndex} md={4}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <Form.Control
                  type="number"
                  min={0}
                  placeholder="Games"
                  value={localSets[setIndex]?.p1 ?? ''}
                  onChange={(e) => updateLocalSet(setIndex, 'p1', e.target.value)}
                />
                <span className="text-muted">Set {setIndex + 1}</span>
                <Form.Control
                  type="number"
                  min={0}
                  placeholder="Games"
                  value={localSets[setIndex]?.p2 ?? ''}
                  onChange={(e) => updateLocalSet(setIndex, 'p2', e.target.value)}
                />
              </div>
            </Col>
          ))}
        </Row>
        <div className="text-end mt-2">
          <Button
            size="sm"
            variant="success"
            onClick={handleComplete}
            disabled={loading || playersNeedRest.length > 0}
          >
            {playersNeedRest.length > 0 ? 'Descanso (completá otro partido)' : 'Finalizar partido (3 sets)'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  )
}
