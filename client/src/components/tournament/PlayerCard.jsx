import { Modal, ListGroup, Badge } from 'react-bootstrap'

export default function PlayerCard({ player, show, onHide }) {
  if (!player) return null
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Carta de jugador</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h5>{player.name}</h5>
        <ListGroup variant="flush">
          <ListGroup.Item className="d-flex justify-content-between">
            Posición general <Badge bg="primary">{player.globalPosition ?? '-'}</Badge>
          </ListGroup.Item>
          <ListGroup.Item className="d-flex justify-content-between">
            Cancha <Badge bg="secondary">{player.courtIndex != null ? player.courtIndex + 1 : '—'}</Badge>
          </ListGroup.Item>
          <ListGroup.Item className="d-flex justify-content-between">
            Posición en cancha <Badge bg="secondary">{player.positionInCourt ?? '—'}</Badge>
          </ListGroup.Item>
          <ListGroup.Item className="d-flex justify-content-between border-top">
            Partidos (total torneo) <Badge bg="primary">{player.totalMatches ?? 0}</Badge>
          </ListGroup.Item>
          <ListGroup.Item className="d-flex justify-content-between">
            Sets (total torneo) <Badge bg="primary">{player.totalSets ?? 0}</Badge>
          </ListGroup.Item>
          <ListGroup.Item className="d-flex justify-content-between">
            Games (total torneo) <Badge bg="primary">{player.totalGames ?? 0}</Badge>
          </ListGroup.Item>
          <ListGroup.Item className="d-flex justify-content-between border-top small text-muted">
            Esta fecha: {player.matchesPlayedInDate ?? 0} partido(s) · {player.setsWonInDate ?? 0} sets · {player.gamesInDate ?? 0} games
          </ListGroup.Item>
        </ListGroup>
      </Modal.Body>
    </Modal>
  )
}
