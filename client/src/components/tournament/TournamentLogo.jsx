const SPORT_LOGOS = {
  padel: {
    bannerSrc: null,
    crestSrc: '/images/smash-open-logo.png',
    bgClass: 'tournament-logo--padel-bg',
    alt: 'Smash Open',
    whiteFilter: false,
  },
  hockey: {
    bannerSrc: null,
    crestSrc: '/images/entre-amigas-logo.png',
    bgClass: 'tournament-logo--hockey-bg',
    alt: 'Entre Amigas Hockey',
    whiteFilter: false,
  },
  futbol_femenino: {
    bannerSrc: '/images/futbol-femenino-banner.png?v=3',
    crestSrc: '/images/estrellas-futbol-logo.png?v=2',
    bgClass: null,
    alt: 'Estrellas del Fútbol Femenino',
    whiteFilter: false,
  },
  futbol_mixto: {
    bannerSrc: null,
    crestSrc: '/images/estrellas-futbol-mixto-logo.png?v=2',
    bgClass: null,
    alt: 'Estrellas del Fútbol Mixto',
    whiteFilter: false,
  },
  futbol_masculino: {
    bannerSrc: '/images/futbol-masculino-banner.png?v=3',
    crestSrc: '/images/estrellas-futbol-masculino-logo.png?v=2',
    bgClass: null,
    alt: 'Estrellas del Fútbol Masculino',
    whiteFilter: false,
  },
}

function resolveLogoKey(sport, gender) {
  if (sport === 'futbol' && gender === 'femenino') return 'futbol_femenino'
  if (sport === 'futbol' && gender === 'mixto') return 'futbol_mixto'
  if (sport === 'futbol' && gender === 'masculino') return 'futbol_masculino'
  return sport
}

export function getTournamentLogoMeta(sport, gender) {
  const logoKey = resolveLogoKey(sport, gender)
  const meta = logoKey ? SPORT_LOGOS[logoKey] ?? null : null
  if (!meta) return null
  return { src: meta.crestSrc, alt: meta.alt }
}

export default function TournamentLogo({ sport, gender, darkBg = false }) {
  const logoKey = resolveLogoKey(sport, gender)
  const logo = logoKey ? SPORT_LOGOS[logoKey] : null
  if (!logo) return null

  const useWhiteFilter = logo.whiteFilter && darkBg
  const headerSrc = logo.bannerSrc ?? logo.crestSrc
  const isBanner = Boolean(logo.bannerSrc)

  const classNames = [
    'tournament-logo',
    useWhiteFilter ? 'tournament-logo--white' : '',
    isBanner ? 'tournament-logo--banner' : '',
    !isBanner && logo.bgClass ? logo.bgClass : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={classNames}>
      <img src={headerSrc} alt={logo.alt} />
    </div>
  )
}
