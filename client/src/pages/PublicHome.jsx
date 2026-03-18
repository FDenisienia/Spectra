import { Container } from 'react-bootstrap'
import GallerySection from '../components/gallery/GallerySection'
import SponsorsCarousel from '../components/SponsorsCarousel'

const HERO_TITLE = 'Spectra Producciones'

const TOURNAMENT_VENUES = [
  {
    id: 'smash-open',
    tournamentName: 'Smash Open',
    venueName: 'La Plata Rugby Club',
    lat: -34.8788168,
    lon: -58.0198541,
    mapsUrl: 'https://www.google.com/maps/place/La+Plata+Rugby+Club/@-34.8788168,-58.0198541,17z/data=!3m1!4b1!4m6!3m5!1s0x95a2dde540f0a8b7:0x8e7c182b3e08d5fc!8m2!3d-34.8788168!4d-58.0198541!16s%2Fg%2F1tfzt2jp!18m1!1e1?entry=ttu',
  },
  {
    id: 'entre-amigas',
    tournamentName: 'Entre Amigas',
    venueName: 'Club Universitario de La Plata',
    lat: -34.8807029,
    lon: -58.0132789,
    mapsUrl: 'https://www.google.com/maps/place/Club+Universitario+de+La+Plata/@-34.8807029,-58.0132789,17z/data=!3m1!4b1!4m6!3m5!1s0x95a2ddf0f0f47e75:0x8a17dcfbc1548515!8m2!3d-34.8807029!4d-58.0132789!16s%2Fg%2F1ts1tdn4!18m1!1e1?entry=ttu',
  },
  {
    id: 'estrellas-futbol',
    tournamentName: 'Estrellas del Futbol',
    venueName: 'Complejo Arena',
    lat: -34.8775241,
    lon: -58.058929,
    mapsUrl: 'https://www.google.com/maps/place/Complejo+Arena/@-34.8775241,-58.058929,17z/data=!3m1!4b1!4m6!3m5!1s0x95a2df0078339735:0x25376f13ead39ea2!8m2!3d-34.8775241!4d-58.058929!16s%2Fg%2F11ypxjd_65!18m1!1e1?entry=ttu',
  },
]

function getMapEmbedUrl(lat, lon, zoomDelta = 0.006) {
  const bbox = [
    lon - zoomDelta,
    lat - zoomDelta * 0.8,
    lon + zoomDelta,
    lat + zoomDelta * 0.8,
  ].join('%2C')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`
}
const HERO_DESCRIPTION = `En Spectra Producciones creemos que el deporte es mucho más que un partido. Es la previa, la competencia, la emoción de cada jugada y los momentos que quedan después de que termina el juego.

Por eso, más que organizar torneos, creamos experiencias deportivas. Cada evento nace a partir de una idea: generar un espacio donde competir, divertirse y compartir con otros que viven el deporte con la misma pasión. Desde la planificación hasta el último partido, cuidamos cada detalle para que cada torneo tenga identidad propia y se viva de una manera especial.

En Spectra Producciones pensamos cada competencia como una historia que se construye fecha a fecha. Los equipos, los cruces, las rivalidades, las sorpresas y los campeones forman parte de un camino que se va escribiendo en cada jornada.

Nuestro objetivo es simple: que cada jugador, equipo y persona que forme parte de nuestros eventos sienta que está viviendo algo más que un torneo. Que está siendo parte de una experiencia que combina organización, competencia y pasión por el deporte.

Porque para nosotros, los torneos no se juegan solamente… se viven.`

export default function PublicHome() {
  const paragraphs = HERO_DESCRIPTION.split(/\n\n+/).filter((p) => p.trim())

  return (
    <div className="landing-page home-page">
      <div className="home-content">
        <section className="home-hero">
          <Container fluid className="home-hero-container px-3 px-md-4">
          <h1 className="home-hero-title">{HERO_TITLE}</h1>
          <div className="home-hero-description">
            {paragraphs.map((p, i) => (
              <p key={i}>{p.trim()}</p>
            ))}
          </div>
          </Container>
        </section>

        <section className="home-venues-section">
          <Container fluid className="home-venues-container px-3 px-md-4">
            <h2 className="home-section-title">Ubicaciones / Sedes</h2>
            <div className="home-venues-grid">
              {TOURNAMENT_VENUES.map((venue) => (
                <a
                  key={venue.id}
                  href={venue.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="home-venue-card"
                >
                  <div className="home-venue-map-wrap">
                    <iframe
                      title={`Mapa - ${venue.venueName}`}
                      src={getMapEmbedUrl(venue.lat, venue.lon)}
                      className="home-venue-map"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                  <div className="home-venue-body">
                    <h3 className="home-venue-tournament">{venue.tournamentName}</h3>
                    <p className="home-venue-name">{venue.venueName}</p>
                    <span className="home-venue-cta">Abrir en Google Maps</span>
                  </div>
                </a>
              ))}
            </div>
          </Container>
        </section>

        <GallerySection />
        <SponsorsCarousel />
      </div>

      <footer className="landing-footer mt-auto">
        <Container className="text-center landing-footer-inner">
          <small>Spectra Producciones © {new Date().getFullYear()}</small>
        </Container>
      </footer>
    </div>
  )
}
