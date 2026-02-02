import { useState, useEffect } from 'react'
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap'

export default function TournamentPlayers({ numPlayers, onSuccess, loading, error }) {
  const [names, setNames] = useState([])

  useEffect(() => {
    setNames(Array(numPlayers).fill(''))
  }, [numPlayers])

  const updateName = (i, value) => {
    const next = [...names]
    next[i] = value
    setNames(next)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const toSend = names.map((n, i) => (n.trim() || `Jugador ${i + 1}`))
    onSuccess(toSend)
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-success text-white">
        <h5 className="mb-0">Participantes ({numPlayers})</h5>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Row xs={1} sm={2} md={3} lg={4}>
            {names.map((name, i) => (
              <Col key={i} className="mb-2">
                <Form.Group>
                  <Form.Label className="small">Jugador {i + 1}</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder={`Jugador ${i + 1}`}
                    value={name}
                    onChange={(e) => updateName(i, e.target.value)}
                  />
                </Form.Group>
              </Col>
            ))}
          </Row>
          <Button type="submit" variant="success" disabled={loading}>
            {loading ? 'Guardando…' : 'Iniciar torneo (generar fecha 1)'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  )
}
