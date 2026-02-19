import { useState, useEffect } from 'react'
import { Card, Row, Col, Form, Button, Badge, Alert } from 'react-bootstrap'
import { setMatchScores, completeMatch } from '../../api/tournament'

function PairNames({ pairIds, players }) {
  const names = (pairIds || []).map((id) => players.find((p) => p.id === id)?.name || id).filter(Boolean)
  return <span>{names.join(' / ')}</span>
}

export default function MatchCard({ tournamentId, match, players, onUpdate, playersNeedRest = [], readOnly = false }) {
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
      const sets = [0, 1, 2].map((i) => {
        const s = localSets[i] || { p1: 0, p2: 0 }
        return { pair1Games: s.p1, pair2Games: s.p2 }
      })
      await setMatchScores(tournamentId, match.id, sets)
      await completeMatch(tournamentId, match.id)
      onUpdate()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (match.completed || readOnly) {
    const sets = match.sets || match.completed ? (match.sets || []) : [0, 1, 2].map((i) => ({
      pair1: match.pair1,
      pair2: match.pair2,
      pair1Games: localSets[i]?.p1 ?? 0,
      pair2Games: localSets[i]?.p2 ?? 0,
    }))
    const displaySets = match.completed ? (match.sets || []) : (match.sets && match.sets.length ? match.sets : sets)
    return (
      <Card className={`mb-3 ${match.completed ? 'border-success' : ''}`}>
        <Card.Body className="py-2">
          {match.completed && (
            <div className="text-center mb-2 small">
              <Badge bg="success">Bloque finalizado — cada jugador jugó 1 set con cada persona</Badge>
            </div>
          )}
          {(displaySets.length ? displaySets : [{ pair1: match.pair1, pair2: match.pair2, pair1Games: 0, pair2Games: 0 }]).map((set, i) => {
            const pair1 = set.pair1 || match.pair1
            const pair2 = set.pair2 || match.pair2
            return (
              <Row key={i} className="align-items-center small mb-1 py-1 border-bottom">
                <Col>
                  <PairNames pairIds={pair1} players={players} />
                </Col>
                <Col className="text-center">
                  <strong>{set.pair1Games ?? 0}</strong> - <strong>{set.pair2Games ?? 0}</strong>
                </Col>
                <Col className="text-end">
                  <PairNames pairIds={pair2} players={players} />
                </Col>
              </Row>
            )
          })}
          {match.completed && (
            <div className="text-center mt-1">
              <Badge bg="success">Partido finalizado</Badge>
            </div>
          )}
        </Card.Body>
      </Card>
    )
  }

  const setsWithPairs = (match.sets || []).map((s, i) => ({
    pair1: s.pair1 ?? match.pair1,
    pair2: s.pair2 ?? match.pair2,
    setIndex: i,
  }))
  while (setsWithPairs.length < 3) {
    setsWithPairs.push({ pair1: match.pair1, pair2: match.pair2, setIndex: setsWithPairs.length })
  }

  return (
    <Card className="mb-3">
      <Card.Body>
        <div className="mb-2 small text-muted">
          Cada jugador juega 1 set con cada persona del bloque (3 sets rotados)
        </div>
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
        {[0, 1, 2].map((setIndex) => {
          const setInfo = setsWithPairs[setIndex] ?? {}
          const pair1 = setInfo.pair1 ?? match.pair1
          const pair2 = setInfo.pair2 ?? match.pair2
          return (
            <Row key={setIndex} className="mb-2 align-items-center">
              <Col md={5} className="small">
                <PairNames pairIds={pair1} players={players} />
              </Col>
              <Col md={2} className="d-flex gap-1 justify-content-center">
                <Form.Control
                  type="number"
                  min={0}
                  placeholder="0"
                  size="sm"
                  className="text-center"
                  style={{ maxWidth: '60px' }}
                  value={localSets[setIndex]?.p1 ?? ''}
                  onChange={(e) => updateLocalSet(setIndex, 'p1', e.target.value)}
                />
                <span className="align-self-center">-</span>
                <Form.Control
                  type="number"
                  min={0}
                  placeholder="0"
                  size="sm"
                  className="text-center"
                  style={{ maxWidth: '60px' }}
                  value={localSets[setIndex]?.p2 ?? ''}
                  onChange={(e) => updateLocalSet(setIndex, 'p2', e.target.value)}
                />
              </Col>
              <Col md={5} className="small text-end">
                <PairNames pairIds={pair2} players={players} />
              </Col>
            </Row>
          )
        })}
        <div className="text-end mt-2">
          <Button
            size="sm"
            variant="success"
            onClick={handleComplete}
            disabled={loading || playersNeedRest.length > 0}
          >
            {playersNeedRest.length > 0 ? 'Descanso (completá otro partido)' : 'Finalizar bloque (3 sets)'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  )
}
