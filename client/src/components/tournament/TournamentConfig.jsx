import { useState } from 'react'
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap'

export default function TournamentConfig({ onSuccess, loading, error }) {
  const [numCourts, setNumCourts] = useState('')
  const [numPlayers, setNumPlayers] = useState('')
  const [validationError, setValidationError] = useState('')

  const courtsNum = Number(numCourts)
  const minPlayers = (Number.isInteger(courtsNum) && courtsNum >= 1) ? courtsNum * 4 : 4

  const handleSubmit = (e) => {
    e.preventDefault()
    setValidationError('')
    const courts = Number(numCourts)
    const players = Number(numPlayers)
    if (numCourts === '' || numCourts === null || !Number.isInteger(courts) || courts < 1) {
      setValidationError('Seleccioná la cantidad de canchas.')
      return
    }
    if (!Number.isInteger(players) || players < courts * 4) {
      setValidationError(`Mínimo ${courts * 4} jugadores (4 por cancha).`)
      return
    }
    const playersPerCourt = players / courts
    if (!Number.isInteger(playersPerCourt)) {
      setValidationError('El total de jugadores debe ser divisible por la cantidad de canchas.')
      return
    }
    if (playersPerCourt % 4 !== 0) {
      setValidationError('Jugadores por cancha deben ser múltiplo de 4 (ej: 8, 12, 16, 20 por cancha).')
      return
    }
    onSuccess(courts, players)
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">Configuración del torneo</h5>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {validationError && <Alert variant="warning">{validationError}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Número de canchas</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  max={99}
                  placeholder="Seleccionar cantidad"
                  value={numCourts}
                  onChange={(e) => setNumCourts(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <Form.Text className="text-muted">
                  Cantidad de canchas disponibles.
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Número de participantes</Form.Label>
                <Form.Control
                  type="number"
                  min={minPlayers}
                  max={999}
                  placeholder={minPlayers > 4 ? minPlayers : ''}
                  value={numPlayers}
                  onChange={(e) => setNumPlayers(e.target.value === '' ? '' : Number(e.target.value))}
                />
                <Form.Text className="text-muted">
                  Mínimo {minPlayers} (4 por cancha). Por cancha debe ser múltiplo de 4 (8, 12, 16, 20…).
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
          <Button type="submit" variant="primary" disabled={loading || numCourts === ''}>
            {loading ? 'Guardando…' : 'Siguiente: cargar jugadores'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  )
}
