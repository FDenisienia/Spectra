import { useEffect, useCallback } from 'react'
import { Modal, Button } from 'react-bootstrap'

/**
 * Lightbox reutilizable para navegar entre imágenes.
 */
export default function GalleryLightbox({ images = [], index, onClose, onIndexChange }) {
  if (index < 0 || !images.length) return null

  const item = images[index]
  const hasMultiple = images.length > 1

  const goPrev = useCallback(() => {
    const next = index <= 0 ? images.length - 1 : index - 1
    onIndexChange(next)
  }, [index, images.length, onIndexChange])

  const goNext = useCallback(() => {
    const next = index >= images.length - 1 ? 0 : index + 1
    onIndexChange(next)
  }, [index, images.length, onIndexChange])

  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [onClose, goPrev, goNext])

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <Modal
      show={!!item}
      onHide={onClose}
      centered
      size="xl"
      className="gallery-lightbox-modal"
      backdrop="static"
    >
      <Modal.Body className="p-0 position-relative" onClick={handleBackdropClick}>
        <Button
          variant="link"
          className="gallery-lightbox-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </Button>

        <div className="gallery-lightbox-content">
          {item && (
            <img
              src={item.src}
              alt={item.alt || 'Imagen ampliada'}
              className="gallery-lightbox-img"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>

        {hasMultiple && (
          <>
            <Button
              variant="link"
              className="gallery-lightbox-nav gallery-lightbox-prev"
              onClick={(e) => { e.stopPropagation(); goPrev() }}
              aria-label="Imagen anterior"
            >
              ‹
            </Button>
            <Button
              variant="link"
              className="gallery-lightbox-nav gallery-lightbox-next"
              onClick={(e) => { e.stopPropagation(); goNext() }}
              aria-label="Siguiente imagen"
            >
              ›
            </Button>

            <div className="gallery-lightbox-indicators" onClick={(e) => e.stopPropagation()}>
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`gallery-lightbox-dot ${i === index ? 'active' : ''}`}
                  onClick={() => onIndexChange(i)}
                  aria-label={`Ir a imagen ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </Modal.Body>
    </Modal>
  )
}
