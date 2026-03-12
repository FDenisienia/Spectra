import { useState, useEffect } from 'react'
import { Container } from 'react-bootstrap'
import * as api from '../api/home'

export default function PublicHome() {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .getHomeContent()
      .then(setContent)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="landing-page">
        <div className="home-loading">
          <div className="home-loading-spinner" />
          <p className="home-loading-text">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="landing-page">
        <Container className="py-5">
          <div className="home-error alert alert-warning">
            No se pudo cargar el contenido. <a href="/">Reintentar</a>
          </div>
        </Container>
      </div>
    )
  }

  const { heroTitle, heroDescription, gallery = [], sponsors = [] } = content || {}

  return (
    <div className="landing-page home-page">
      {/* Hero / Presentación */}
      <section className="home-hero">
        <Container className="home-hero-container">
          <h1 className="home-hero-title">{heroTitle || 'Espectra Producciones'}</h1>
          <p className="home-hero-description">{heroDescription || ''}</p>
        </Container>
      </section>

      {/* Galería */}
      {gallery.length > 0 && (
        <section className="home-gallery-section">
          <Container>
            <h2 className="home-section-title">Galería</h2>
            <div className="home-gallery">
              {gallery.map((img) => (
                <a
                  key={img.id}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="home-gallery-item"
                  title={img.alt || undefined}
                >
                  <img src={img.url} alt={img.alt || 'Imagen de la galería'} loading="lazy" />
                </a>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <section className="home-sponsors-section">
          <Container>
            <h2 className="home-section-title">Sponsors</h2>
            <div className="home-sponsors">
              {sponsors.map((s) => {
                const Wrapper = s.link ? 'a' : 'div'
                const wrapperProps = s.link
                  ? { href: s.link, target: '_blank', rel: 'noopener noreferrer' }
                  : {}
                return (
                  <Wrapper
                    key={s.id}
                    className="home-sponsor-card"
                    {...wrapperProps}
                  >
                    {s.logoUrl ? (
                      <img src={s.logoUrl} alt={s.name} loading="lazy" />
                    ) : (
                      <span className="home-sponsor-name">{s.name}</span>
                    )}
                  </Wrapper>
                )
              })}
            </div>
          </Container>
        </section>
      )}

      <footer className="landing-footer mt-auto">
        <Container className="text-center landing-footer-inner">
          <small>Espectra Producciones © {new Date().getFullYear()}</small>
        </Container>
      </footer>
    </div>
  )
}
