import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Container, Card, Form, Button, Alert } from 'react-bootstrap'
import { login } from '../api/auth'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || '/admin'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-center">
        <Card className="shadow-sm" style={{ maxWidth: '400px', width: '100%' }}>
          <Card.Header className="bg-dark text-white">
            <Card.Title className="mb-0">Administración Spectra</Card.Title>
          </Card.Header>
          <Card.Body className="p-4">
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Usuario</Form.Label>
                <Form.Control
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  autoFocus
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Contraseña</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </Form.Group>
              <Button type="submit" variant="dark" className="w-100" disabled={loading}>
                {loading ? 'Entrando…' : 'Entrar'}
              </Button>
            </Form>
            <p className="text-muted small mt-3 mb-0 text-center">
              <a href="/">Volver al inicio</a>
            </p>
          </Card.Body>
        </Card>
      </div>
    </Container>
  )
}
