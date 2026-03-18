const SPORT_LOGOS = {
  padel: { src: '/images/smash-open-logo.png', alt: 'Smash Open', whiteFilter: false },
  hockey: { src: '/images/entre-amigas-logo.png', alt: 'Entre Amigas Hockey', whiteFilter: false },
  futbol_femenino: { src: '/images/estrellas-futbol-logo.png', alt: 'Estrellas del Fútbol Femenino', whiteFilter: false },
  futbol_mixto: { src: '/images/estrellas-futbol-mixto-logo.png', alt: 'Estrellas del Fútbol Mixto', whiteFilter: false },
  futbol_masculino: { src: '/images/estrellas-futbol-masculino-logo.png', alt: 'Estrellas del Fútbol Masculino', whiteFilter: false },
}

export default function TournamentLogo({ sport, gender, darkBg = false }) {
  let logoKey = sport
  if (sport === 'futbol' && gender === 'femenino') logoKey = 'futbol_femenino'
  else if (sport === 'futbol' && gender === 'mixto') logoKey = 'futbol_mixto'
  else if (sport === 'futbol' && gender === 'masculino') logoKey = 'futbol_masculino'
  const logo = logoKey ? SPORT_LOGOS[logoKey] : null
  if (!logo) return null
  const useWhiteFilter = logo.whiteFilter && darkBg
  const isFutbol = sport === 'futbol'
  const isHockey = sport === 'hockey'
  const isPadel = sport === 'padel'
  return (
    <div className={`tournament-logo ${useWhiteFilter ? 'tournament-logo--white' : ''} ${isFutbol ? 'tournament-logo--futbol-bg' : ''} ${isHockey ? 'tournament-logo--hockey-bg' : ''} ${isPadel ? 'tournament-logo--padel-bg' : ''}`}>
      <img src={logo.src} alt={logo.alt} />
    </div>
  )
}
