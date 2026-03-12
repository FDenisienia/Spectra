import { getTheme } from '../../config/tournamentThemes'

export default function TournamentBackground({ sport = 'padel', gender }) {
  const theme = getTheme(sport, gender)
  return (
    <div className="tournament-bg" aria-hidden>
      <div className="tournament-bg-image">
        <img
          src={theme.bgImage}
          alt=""
          fetchPriority="high"
          loading="eager"
          decoding="async"
        />
      </div>
      <div
        className="tournament-bg-overlay"
        style={{ background: theme.overlayGradient }}
      />
    </div>
  )
}
