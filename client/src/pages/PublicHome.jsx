import { Container } from 'react-bootstrap'

export default function PublicHome() {
  return (
    <div className="landing-page">
      <Container className="landing-container py-4 py-lg-5 px-3 px-sm-4">
        <section className="landing-hero">
          <h1 className="landing-hero-title">Spectra</h1>
          <p className="landing-hero-lead lead mb-0">
            Plataforma para gestionar torneos deportivos. Rankings, posiciones, fechas y reglamento en un solo lugar.
          </p>
        </section>
      </Container>

      <footer className="landing-footer mt-auto">
        <Container className="text-center landing-footer-inner">
          <small>Spectra © {new Date().getFullYear()}</small>
        </Container>
      </footer>
    </div>
  )
}
