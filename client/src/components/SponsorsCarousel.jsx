
/* fill: 0.88-1.0 = cuánto del contenedor ocupa. Todos más grandes con padding reducido */
const SPONSORS = [
  { id: 'playtennis', name: 'Play Tennis La Plata Rugby Club', img: '/images/sponsors/playtennis.png', fill: 1 },
  { id: 'trago', name: 'Trago Almacén de Bebidas', img: '/images/sponsors/trago.png', fill: 1 },
  { id: 'flick', name: 'Flick', img: '/images/sponsors/flick.png', fill: 1 },
  { id: 'flanaticos', name: 'Flanaticos', img: '/images/sponsors/flanaticos.png', fill: 1 },
  { id: 'hidrataccion', name: 'Hidrataccion', img: '/images/sponsors/hidrataccion.png', fill: 1 },
  { id: 'spectra', name: 'Spectra', img: '/images/sponsors/spectra.png', fill: 1 },
  { id: '0221', name: '0221.com.ar', img: '/images/sponsors/0221.png', fill: 0.9 },
  { id: 'baly', name: 'Baly Energy Drink', img: '/images/sponsors/baly.png', fill: 0.98 },
  { id: 'complejo-arena', name: 'Complejo Arena', img: '/images/sponsors/complejo-arena.png', fill: 1 },
  { id: 'durban', name: 'Durban', img: '/images/sponsors/durban.png', fill: 2 },
  { id: 'bocado', name: 'Bocado', img: '/images/sponsors/bocado.png', fill: 2 },
  { id: 'fotografia-deportiva', name: 'Fotografía Deportiva', img: '/images/sponsors/fotografia-deportiva.png', fill: 2 },
  { id: 'gatorade', name: 'Gatorade', img: '/images/sponsors/gatorade.png', fill: 0.92 },
]

function SponsorItem({ sponsor }) {
  return (
    <div className="sponsors-carousel-item">
      <div className="sponsors-carousel-card">
        <div className="sponsors-carousel-card-inner">
          <div className="sponsors-logo-box" data-sponsor={sponsor.id} style={{ '--logo-fill': String(sponsor.fill ?? 0.94) }}>
            {sponsor.id === 'trago' ? (
              <div className="sponsor-logo-bg" style={{ backgroundImage: `url(${sponsor.img})` }} role="img" aria-label={sponsor.name} />
            ) : (
              <img
                src={sponsor.img}
                alt={sponsor.name}
                loading="lazy"
                onError={(e) => {
                  const box = e.target.closest('.sponsors-logo-box')
                  if (box) box.style.display = 'none'
                  const fallback = e.target.closest('.sponsors-carousel-card-inner')?.querySelector('.sponsors-carousel-fallback')
                  if (fallback) fallback.classList.add('visible')
                }}
              />
            )}
          </div>
          <span className="sponsors-carousel-fallback">{sponsor.name}</span>
        </div>
      </div>
    </div>
  )
}

export default function SponsorsCarousel() {
  const duplicatedSponsors = [...SPONSORS, ...SPONSORS]

  return (
    <section className="home-sponsors-section">
      <div className="home-sponsors-container px-3 px-md-4">
        <h2 className="home-sponsors-title">Nuestros Sponsors</h2>
        <div className="sponsors-carousel-wrap">
          <div className="sponsors-carousel-track">
            {duplicatedSponsors.map((s, i) => (
              <SponsorItem key={`${s.id}-${i}`} sponsor={s} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
