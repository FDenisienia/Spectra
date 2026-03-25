import { Button, Form, Alert } from 'react-bootstrap'
import { formatMatchDateTimeArgentina } from '../../utils/matchDateTime'

/** Fecha legible o placeholder sin guiones sueltos como único contenido */
export function formatMatchDateAdmin(value) {
  if (value == null || String(value).trim() === '') return 'Sin definir'
  const f = formatMatchDateTimeArgentina(value)
  return f === '—' ? 'Sin definir' : f
}

/** Fila de fixture en jornadas (con fecha y acciones secundarias) */
export function LeagueFixtureMatchRow({
  match,
  homeLabel,
  awayLabel,
  isPadel,
  editingMatchId,
  matchScoreForm,
  setMatchScoreForm,
  setEditingMatchId,
  onSaveScore,
  onOpenGoalsCards,
  onOpenEditMatch,
  onDeleteMatch,
  matchdayId,
  saving,
  scoreInlineError,
}) {
  const editing = editingMatchId === match.id
  const played = match.status === 'played'

  const scoreBlock = editing ? (
    <div className="league-match-score league-match-score--editing">
      <span className="league-match-score__inputs" title={isPadel ? 'Sets' : 'Resultado'}>
        <Form.Control
          type="number"
          size="sm"
          className={`league-match-score__input${scoreInlineError ? ' is-invalid' : ''}`}
          value={matchScoreForm.home_score}
          onChange={(e) => setMatchScoreForm((f) => ({ ...f, home_score: e.target.value }))}
        />
        <span className="league-match-score__dash">—</span>
        <Form.Control
          type="number"
          size="sm"
          className={`league-match-score__input${scoreInlineError ? ' is-invalid' : ''}`}
          value={matchScoreForm.away_score}
          onChange={(e) => setMatchScoreForm((f) => ({ ...f, away_score: e.target.value }))}
        />
      </span>
      {isPadel && (
        <span className="league-match-score__games text-muted small" title="Games">
          <span className="league-match-score__games-inner">
            <Form.Control
              type="number"
              size="sm"
              className="league-match-score__input league-match-score__input--narrow"
              placeholder="G"
              value={matchScoreForm.home_games}
              onChange={(e) => setMatchScoreForm((f) => ({ ...f, home_games: e.target.value }))}
            />
            <span className="league-match-score__dash">—</span>
            <Form.Control
              type="number"
              size="sm"
              className="league-match-score__input league-match-score__input--narrow"
              placeholder="G"
              value={matchScoreForm.away_games}
              onChange={(e) => setMatchScoreForm((f) => ({ ...f, away_games: e.target.value }))}
            />
          </span>
        </span>
      )}
      <div className="league-match-score__edit-actions">
        <Button
          size="sm"
          className="league-match-btn-primary"
          onClick={() =>
            onSaveScore(match.id, matchScoreForm.home_score, matchScoreForm.away_score, matchScoreForm.home_games, matchScoreForm.away_games)
          }
        >
          Guardar
        </Button>
        <Button size="sm" variant="outline-secondary" onClick={() => setEditingMatchId(null)}>
          Cancelar
        </Button>
      </div>
      {scoreInlineError && (
        <Alert variant="danger" className="league-match-score-inline-error py-2 px-2 small mb-0 mt-2">
          {scoreInlineError}
        </Alert>
      )}
    </div>
  ) : played ? (
    <div className="league-match-score league-match-score--played">
      <div className="league-match-score__value">
        <span className="league-match-score__nums">
          {match.home_score ?? 0}
          <span className="league-match-score__sep">—</span>
          {match.away_score ?? 0}
        </span>
        {isPadel && match.home_games != null && match.away_games != null && (
          <span className="league-match-score__sub text-muted">
            ({match.home_games}—{match.away_games})
          </span>
        )}
      </div>
      <button
        type="button"
        className="league-match-link-btn"
        onClick={() => {
          setEditingMatchId(match.id)
          setMatchScoreForm({
            home_score: match.home_score ?? '',
            away_score: match.away_score ?? '',
            home_games: match.home_games ?? '',
            away_games: match.away_games ?? '',
          })
        }}
      >
        Editar resultado
      </button>
    </div>
  ) : (
    <div className="league-match-score league-match-score--empty">
      <Button
        size="sm"
        className="league-match-btn-primary"
        onClick={() => {
          setEditingMatchId(match.id)
          setMatchScoreForm({ home_score: '', away_score: '', home_games: '', away_games: '' })
        }}
      >
        Cargar resultado
      </Button>
    </div>
  )

  return (
    <div className="league-match-row">
      <div className="league-match-row__teams">
        <span className="league-match-row__home">{homeLabel}</span>
        <span className="league-match-row__vs" aria-hidden="true">
          vs
        </span>
        <span className="league-match-row__away">{awayLabel}</span>
      </div>
      {scoreBlock}
      <div className="league-match-row__date">
        <span className="league-match-row__date-label d-md-none">Fecha</span>
        <span className={match.played_at ? 'league-match-row__date-value' : 'league-match-row__date-placeholder'}>
          {formatMatchDateAdmin(match.played_at)}
        </span>
      </div>
      <div className="league-match-row__actions">
        <div className="league-match-row__actions-wrap">
          {!isPadel && (
            <button type="button" className="league-match-ghost-link" onClick={() => onOpenGoalsCards(match)}>
              Goles y tarjetas
            </button>
          )}
          <div className="league-match-row__actions-btns">
            <Button
              size="sm"
              variant="outline-secondary"
              className="league-match-btn-neutral league-match-row__action-btn"
              disabled={saving}
              onClick={() => onOpenEditMatch(matchdayId, match)}
            >
              Editar
            </Button>
            <Button
              size="sm"
              variant="outline-danger"
              className="league-match-btn-danger-soft league-match-row__action-btn"
              disabled={saving}
              onClick={() => onDeleteMatch(match.id, matchdayId)}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Playoffs y fase final: solo equipos y resultado */
export function LeaguePlayoffFixtureRow({
  match,
  homeLabel,
  awayLabel,
  editingPlayoffMatchId,
  matchScoreForm,
  setMatchScoreForm,
  setEditingPlayoffMatchId,
  onSavePlayoffScore,
}) {
  const editing = editingPlayoffMatchId === match.id
  const played = match.status === 'played'

  const scoreBlock = editing ? (
    <div className="league-match-score league-match-score--editing">
      <span className="league-match-score__inputs">
        <Form.Control
          type="number"
          size="sm"
          className="league-match-score__input"
          value={matchScoreForm.home_score}
          onChange={(e) => setMatchScoreForm((f) => ({ ...f, home_score: e.target.value }))}
        />
        <span className="league-match-score__dash">—</span>
        <Form.Control
          type="number"
          size="sm"
          className="league-match-score__input"
          value={matchScoreForm.away_score}
          onChange={(e) => setMatchScoreForm((f) => ({ ...f, away_score: e.target.value }))}
        />
      </span>
      <div className="league-match-score__edit-actions">
        <Button size="sm" className="league-match-btn-primary" onClick={() => onSavePlayoffScore(match.id, matchScoreForm.home_score, matchScoreForm.away_score)}>
          Guardar
        </Button>
        <Button size="sm" variant="outline-secondary" onClick={() => setEditingPlayoffMatchId(null)}>
          Cancelar
        </Button>
      </div>
    </div>
  ) : played ? (
    <div className="league-match-score league-match-score--played">
      <div className="league-match-score__value">
        <span className="league-match-score__nums">
          {match.home_score ?? 0}
          <span className="league-match-score__sep">—</span>
          {match.away_score ?? 0}
        </span>
      </div>
      <button
        type="button"
        className="league-match-link-btn"
        onClick={() => {
          setEditingPlayoffMatchId(match.id)
          setMatchScoreForm({ home_score: match.home_score ?? '', away_score: match.away_score ?? '' })
        }}
      >
        Editar resultado
      </button>
    </div>
  ) : (
    <div className="league-match-score league-match-score--empty">
      <Button
        size="sm"
        className="league-match-btn-primary"
        onClick={() => {
          setEditingPlayoffMatchId(match.id)
          setMatchScoreForm({ home_score: '', away_score: '' })
        }}
      >
        Cargar resultado
      </Button>
    </div>
  )

  return (
    <div className="league-match-row league-match-row--playoff">
      <div className="league-match-row__teams">
        <span className="league-match-row__home">{homeLabel}</span>
        <span className="league-match-row__vs" aria-hidden="true">
          vs
        </span>
        <span className="league-match-row__away">{awayLabel}</span>
      </div>
      {scoreBlock}
    </div>
  )
}
