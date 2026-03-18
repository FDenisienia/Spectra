import { useState, useEffect, useCallback } from 'react'
import { Carousel, Modal, Button, Container } from 'react-bootstrap'

/** Imágenes por defecto para la galería. Se pueden sobrescribir vía prop `images`. */
const DEFAULT_GALLERY_IMAGES = [
  { id: '1', src: '/images/futbol-bg.png', alt: 'Estrellas del Fútbol', caption: 'Estrellas del Fútbol' },
  { id: '2', src: '/images/padel-bg.png', alt: 'Smash Open Pádel', caption: 'Smash Open' },
  { id: 'eah-113', src: '/images/gallery/EAHockey-113.png', alt: 'Entre Amigas Hockey - jugadora conduciendo la bocha', caption: 'Entre Amigas Hockey' },
  { id: 'eah-89', src: '/images/gallery/EAHockey-89.png', alt: 'Entre Amigas Hockey - jugadora en estocada', caption: 'Entre Amigas Hockey' },
  { id: 'eah-72', src: '/images/gallery/EAHockey-72.png', alt: 'Entre Amigas Hockey - acción en la cancha', caption: 'Entre Amigas Hockey' },
  { id: 'eah-58', src: '/images/gallery/EAHockey-58.png', alt: 'Entre Amigas Hockey - jugada nocturna', caption: 'Entre Amigas Hockey' },
  { id: 'eah-47', src: '/images/gallery/EAHockey-47.png', alt: 'Entre Amigas Hockey - jugadora en posición', caption: 'Entre Amigas Hockey' },
  { id: '4', src: '/images/smash-open-logo.png', alt: 'Smash Open', caption: 'Smash Open' },
  { id: '5', src: '/images/estrellas-futbol-mixto-logo.png', alt: 'Estrellas del Fútbol Mixto', caption: 'Estrellas del Fútbol Mixto' },
]

/**
 * Galería tipo carrusel con autoplay, modal lightbox y navegación.
 * Las imágenes se pueden cargar dinámicamente vía prop `images` o desde el backend.
 */
export default function TournamentGallery({ images = DEFAULT_GALLERY_IMAGES, autoplayInterval = 4000 }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const items = Array.isArray(images) && images.length > 0 ? images : DEFAULT_GALLERY_IMAGES

  const openLightbox = useCallback((index) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false)
  }, [])

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i <= 0 ? items.length - 1 : i - 1))
  }, [items.length])

  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i >= items.length - 1 ? 0 : i + 1))
  }, [items.length])

  useEffect(() => {
    const handleKeydown = (e) => {
      if (!lightboxOpen) return
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [lightboxOpen, closeLightbox, goPrev, goNext])

  return (
    <section className="home-gallery-section">
      <Container fluid className="px-3 px-md-4">
        <h2 className="home-gallery-title">Galería de Torneos</h2>

        <div className="tournament-gallery-wrap">
          <Carousel
            indicators
            controls
            fade
            interval={lightboxOpen ? null : autoplayInterval}
            pause="hover"
            className="tournament-gallery-carousel"
          >
            {items.map((item, idx) => (
              <Carousel.Item key={item.id || idx}>
                <div
                  className="tournament-gallery-slide"
                  onClick={() => openLightbox(idx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openLightbox(idx)}
                  aria-label={`Ver imagen ${idx + 1} de ${items.length}`}
                >
                  <img
                    src={item.src}
                    alt={item.alt || item.caption || `Imagen ${idx + 1}`}
                    className="tournament-gallery-img"
                    loading="lazy"
                  />
                  <div className="tournament-gallery-overlay" />
                  {item.caption && (
                    <Carousel.Caption className="tournament-gallery-caption">
                      <span>{item.caption}</span>
                    </Carousel.Caption>
                  )}
                </div>
              </Carousel.Item>
            ))}
          </Carousel>
        </div>
      </Container>

      <Modal
        show={lightboxOpen}
        onHide={closeLightbox}
        centered
        size="xl"
        className="tournament-gallery-modal"
        backdrop="static"
      >
        <Modal.Body className="p-0 position-relative">
          <Button
            variant="link"
            className="tournament-gallery-modal-close"
            onClick={closeLightbox}
            aria-label="Cerrar"
          >
            ×
          </Button>

          <div className="tournament-gallery-modal-content">
            {items[lightboxIndex] && (
              <img
                src={items[lightboxIndex].src}
                alt={items[lightboxIndex].alt || items[lightboxIndex].caption || 'Imagen ampliada'}
                className="tournament-gallery-modal-img"
              />
            )}
          </div>

          {items.length > 1 && (
            <>
              <Button
                variant="link"
                className="tournament-gallery-modal-nav tournament-gallery-modal-prev"
                onClick={goPrev}
                aria-label="Imagen anterior"
              >
                ‹
              </Button>
              <Button
                variant="link"
                className="tournament-gallery-modal-nav tournament-gallery-modal-next"
                onClick={goNext}
                aria-label="Siguiente imagen"
              >
                ›
              </Button>

              <div className="tournament-gallery-modal-indicators">
                {items.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`tournament-gallery-modal-dot ${i === lightboxIndex ? 'active' : ''}`}
                    onClick={() => setLightboxIndex(i)}
                    aria-label={`Ir a imagen ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </section>
  )
}
