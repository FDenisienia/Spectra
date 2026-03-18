import { useState, useCallback } from 'react'
import { Container } from 'react-bootstrap'
import { SPORTS, getImagesBySport } from '../../config/galleryData'
import GalleryLightbox from './GalleryLightbox'

const SPORT_ORDER = ['hockey', 'padel', 'futbol']

function SportCard({ sport, onClick }) {
  const { id, name, coverImage, coverAlt } = sport
  return (
    <button
      type="button"
      className="gallery-sport-card"
      onClick={() => onClick(id)}
      aria-label={`Ver galería de ${name}`}
    >
      <div className="gallery-sport-card-bg">
        <img src={coverImage} alt="" />
      </div>
      <div className="gallery-sport-card-overlay" />
      <div className="gallery-sport-card-content">
        <h3 className="gallery-sport-card-title">{name}</h3>
        <span className="gallery-sport-card-cta">Ver galería</span>
      </div>
    </button>
  )
}

function GalleryGrid({ images, onImageClick }) {
  return (
    <div className="gallery-grid">
      {images.map((img, idx) => (
        <button
          key={img.id}
          type="button"
          className="gallery-grid-item"
          onClick={() => onImageClick(idx)}
          aria-label={img.alt}
        >
          <img src={img.src} alt={img.alt} loading="lazy" />
          <div className="gallery-grid-item-overlay" />
        </button>
      ))}
    </div>
  )
}

export default function GallerySection() {
  const [activeSport, setActiveSport] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  const images = activeSport ? getImagesBySport(activeSport) : []

  const openLightbox = useCallback((index) => {
    setLightboxIndex(index)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxIndex(-1)
  }, [])

  const goBack = useCallback(() => {
    setActiveSport(null)
    setLightboxIndex(-1)
  }, [])

  // Vista inicial: 3 cards
  if (!activeSport) {
    return (
      <section className="gallery-section">
        <Container fluid className="gallery-container px-3 px-md-4">
          <h2 className="gallery-section-title">Momentos</h2>
          <div className="gallery-sport-cards">
            {SPORT_ORDER.map((sportId) => (
              <SportCard
                key={sportId}
                sport={SPORTS[sportId]}
                onClick={setActiveSport}
              />
            ))}
          </div>
        </Container>
      </section>
    )
  }

  // Vista interna: galería por deporte + tabs
  return (
    <section className="gallery-section gallery-section--expanded">
      <Container fluid className="gallery-container px-3 px-md-4">
        <h2 className="gallery-section-title">Momentos</h2>

        {/* Tabs */}
        <div className="gallery-tabs" role="tablist">
          <button
            type="button"
            className="gallery-tab-back"
            onClick={goBack}
            aria-label="Volver a deportes"
          >
            ‹ Volver
          </button>
          {SPORT_ORDER.map((sportId) => (
            <button
              key={sportId}
              type="button"
              role="tab"
              aria-selected={activeSport === sportId}
              className={`gallery-tab ${activeSport === sportId ? 'active' : ''}`}
              onClick={() => setActiveSport(sportId)}
            >
              {SPORTS[sportId].name}
            </button>
          ))}
        </div>

        {/* Grid de imágenes */}
        {images.length > 0 ? (
          <GalleryGrid images={images} onImageClick={openLightbox} />
        ) : (
          <p className="gallery-empty">No hay imágenes en esta galería todavía.</p>
        )}
      </Container>

      <GalleryLightbox
        images={images}
        index={lightboxIndex}
        onClose={closeLightbox}
        onIndexChange={setLightboxIndex}
      />
    </section>
  )
}
