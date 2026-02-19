import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Container, Navbar, Nav, Card, Table, Button, Spinner, Alert, Modal, Form, Tabs, Tab, Row, Col } from 'react-bootstrap'
import * as api from '../api/league'
import * as tournamentApi from '../api/tournament'
import '../styles/League.css'

export default function LeagueAdmin() {
  const { id: tournamentId } = useParams()
  const [tournament, setTournament] = useState(null)
  const [teams, setTeams] = useState([])
  const [matchdays, setMatchdays] = useState([])
  const [standings, setStandings] = useState([])
  const [standingsByZone, setStandingsByZone] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showMatchdayModal, setShowMatchdayModal] = useState(false)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [editingMatchdayId, setEditingMatchdayId] = useState(null)
  const [matchdayMatches, setMatchdayMatches] = useState({})
  const [teamForm, setTeamForm] = useState({ name: '', shield_url: '', zone_id: '' })
  const [matchdayNumber, setMatchdayNumber] = useState(1)
  const [matchForm, setMatchForm] = useState({ zone_id: '', home_team_id: '', away_team_id: '', played_at: '' })
  const [editingMatchId, setEditingMatchId] = useState(null)
  const [matchScoreForm, setMatchScoreForm] = useState({ home_score: '', away_score: '', home_games: '', away_games: '' })
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({ points_win: 3, points_draw: 1, points_loss: 0, round_trip: false })
  const [configSaving, setConfigSaving] = useState(false)
  const [fixtureGenerating, setFixtureGenerating] = useState(false)
  const [zones, setZones] = useState([])
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [zoneForm, setZoneForm] = useState({ name: '', sort_order: 0 })
  const [scorers, setScorers] = useState([])
  const [discipline, setDiscipline] = useState([])
  const [showGoalsCardsModal, setShowGoalsCardsModal] = useState(false)
  const [editingMatchForGoals, setEditingMatchForGoals] = useState(null)
  const [matchGoals, setMatchGoals] = useState([])
  const [matchCards, setMatchCards] = useState([])
  const [goalForm, setGoalForm] = useState({ player_name: '', team_id: '', goals: '1' })
  const [cardForm, setCardForm] = useState({ player_name: '', team_id: '', card_type: 'yellow' })
  const [showPlayersModal, setShowPlayersModal] = useState(false)
  const [editingTeamForPlayers, setEditingTeamForPlayers] = useState(null)
  const [teamPlayers, setTeamPlayers] = useState([])
  const [playerForm, setPlayerForm] = useState({ player_name: '', dni: '', shirt_number: '', role: 'player' })
  const [editingPlayerId, setEditingPlayerId] = useState(null)
  const [editPlayerForm, setEditPlayerForm] = useState({ player_name: '', dni: '', shirt_number: '', role: 'player' })
  const [playersByTeam, setPlayersByTeam] = useState({})
  const [drawZonesNum, setDrawZonesNum] = useState(2)
  const [drawZonesLoading, setDrawZonesLoading] = useState(false)
  const [playoffGenerating, setPlayoffGenerating] = useState(false)
  const [playoffBracket, setPlayoffBracket] = useState([])
  const [editingPlayoffMatchId, setEditingPlayoffMatchId] = useState(null)
  const [activeTab, setActiveTab] = useState('teams')

  const loadTournament = () => {
    if (!tournamentId) return
    tournamentApi.getTournament(tournamentId).then(setTournament).catch(() => setTournament(null))
  }

  const loadAll = () => {
    if (!tournamentId) return
    setLoading(true)
    Promise.all([
      tournamentApi.getTournament(tournamentId),
      api.getTeams(tournamentId),
      api.getMatchdays(tournamentId),
      api.getConfig(tournamentId),
      api.getZones(tournamentId),
      api.getScorers(tournamentId),
      api.getDiscipline(tournamentId),
      api.getPlayoffBracket(tournamentId).catch(() => []),
    ])
      .then(([t, te, mds, cfg, z, sc, disc, playoff]) => {
        setTournament(t)
        setTeams(te || [])
        setMatchdays(mds || [])
        setConfig(cfg || { points_win: 3, points_draw: 1, points_loss: 0, round_trip: false })
        setZones(z || [])
        setScorers(sc || [])
        setDiscipline(disc || [])
        setPlayoffBracket(Array.isArray(playoff) ? playoff : [])
        setError(null)
        const zonesList = z || []
        if (zonesList.length === 0) {
          return api.getStandings(tournamentId).then((st) => {
            setStandings(st || [])
            setStandingsByZone({})
          })
        }
        return Promise.all(zonesList.map((zone) =>
          api.getStandings(tournamentId, { zoneId: zone.id }).then((st) => ({ zoneId: zone.id, standings: st || [] }))
        )).then((results) => {
          const byZone = {}
          results.forEach((r) => { byZone[r.zoneId] = r.standings })
          setStandingsByZone(byZone)
          setStandings([])
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAll()
  }, [tournamentId])

  const loadMatchdayMatches = (matchdayId) => {
    if (!tournamentId || !matchdayId) return
    api.getMatches(tournamentId, matchdayId).then((list) => {
      setMatchdayMatches((prev) => ({ ...prev, [matchdayId]: list }))
    }).catch(() => {})
  }

  const handleAddZone = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.createZone(tournamentId, { name: zoneForm.name.trim() || (tournament?.sport === 'padel' ? 'Grupo' : 'Zona'), sort_order: zoneForm.sort_order ?? zones.length })
      setShowZoneModal(false)
      setZoneForm({ name: '', sort_order: zones.length })
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteZone = async (zoneId) => {
    const msg = tournament?.sport === 'padel'
      ? '¿Eliminar este grupo? Las parejas quedarán sin grupo asignado.'
      : '¿Eliminar esta zona? Los equipos quedarán sin zona asignada.'
    if (!window.confirm(msg)) return
    try {
      await api.deleteZone(tournamentId, zoneId)
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDrawZones = async (e) => {
    e.preventDefault()
    const num = Number(drawZonesNum) || 2
    if (num < 1 || num > teams.length) {
      setError('El número de zonas debe estar entre 1 y la cantidad de equipos.')
      return
    }
    if (!window.confirm(`¿Crear ${num} zona(s) y sortear los ${teams.length} equipos al azar? Se reemplazarán las zonas actuales.`)) return
    setDrawZonesLoading(true)
    setError(null)
    try {
      await api.drawZones(tournamentId, num)
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setDrawZonesLoading(false)
    }
  }

  const openPlayersModal = (team) => {
    setEditingTeamForPlayers(team)
    setPlayerForm({ player_name: '', dni: '', shirt_number: '', role: 'player' })
    setEditingPlayerId(null)
    if (!team?.id) return
    api.getTeamPlayers(tournamentId, team.id).then((list) => setTeamPlayers(list || [])).catch(() => {})
    setShowPlayersModal(true)
  }

  const startEditPlayer = (p) => {
    setEditingPlayerId(p.id)
    setEditPlayerForm({
      player_name: p.player_name || '',
      dni: p.dni || '',
      shirt_number: p.shirt_number ?? '',
      role: p.role || 'player',
    })
  }

  const cancelEditPlayer = () => {
    setEditingPlayerId(null)
  }

  const handleSavePlayer = async (e) => {
    e.preventDefault()
    if (!editingTeamForPlayers?.id || !editingPlayerId) return
    setSaving(true)
    try {
      await api.updateTeamPlayer(tournamentId, editingTeamForPlayers.id, editingPlayerId, {
        player_name: editPlayerForm.player_name?.trim() || 'Jugador',
        dni: editPlayerForm.dni?.trim() || null,
        shirt_number: editPlayerForm.shirt_number ? Number(editPlayerForm.shirt_number) : null,
        role: editPlayerForm.role || 'player',
      })
      const list = await api.getTeamPlayers(tournamentId, editingTeamForPlayers.id)
      setTeamPlayers(list || [])
      setEditingPlayerId(null)
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const roleLabel = (role) => {
    const labels = { captain: 'Capitán', player: 'Jugador', guest: 'Invitado' }
    return labels[role] || 'Jugador'
  }

  const handleAddPlayer = async (e) => {
    e.preventDefault()
    if (!editingTeamForPlayers?.id || !playerForm.player_name?.trim()) return
    setSaving(true)
    try {
      await api.createTeamPlayer(tournamentId, editingTeamForPlayers.id, {
        player_name: playerForm.player_name.trim(),
        dni: playerForm.dni?.trim() || null,
        shirt_number: playerForm.shirt_number ? Number(playerForm.shirt_number) : null,
        role: playerForm.role || 'player',
      })
      const list = await api.getTeamPlayers(tournamentId, editingTeamForPlayers.id)
      setTeamPlayers(list || [])
      setPlayerForm({ player_name: '', dni: '', shirt_number: '', role: 'player' })
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePlayer = async (playerId) => {
    try {
      await api.deleteTeamPlayer(tournamentId, editingTeamForPlayers.id, playerId)
      const list = await api.getTeamPlayers(tournamentId, editingTeamForPlayers.id)
      setTeamPlayers(list || [])
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  const openGoalsCardsModal = (match) => {
    setEditingMatchForGoals(match)
    setGoalForm({ player_name: '', team_id: match?.home_team_id || '', goals: '1' })
    setCardForm({ player_name: '', team_id: match?.home_team_id || '', card_type: 'yellow' })
    if (!match?.id) return
    const teamIds = match?.home_team_id && match?.away_team_id
      ? [match.home_team_id, match.away_team_id]
      : []
    Promise.all([
      api.getGoals(tournamentId, match.id),
      api.getCards(tournamentId, match.id),
      teamIds.length ? api.getPlayersByTeams(tournamentId, teamIds) : Promise.resolve({}),
    ]).then(([goals, cards, byTeam]) => {
      setMatchGoals(goals || [])
      setMatchCards(cards || [])
      setPlayersByTeam(byTeam || {})
    }).catch(() => {})
    setShowGoalsCardsModal(true)
  }

  const handleAddGoal = async (e) => {
    e.preventDefault()
    if (!editingMatchForGoals?.id || !goalForm.player_name || !goalForm.team_id) return
    setSaving(true)
    try {
      await api.addGoal(tournamentId, editingMatchForGoals.id, {
        player_name: goalForm.player_name.trim(),
        team_id: goalForm.team_id,
        goals: goalForm.goals ? Number(goalForm.goals) : 1,
      })
      const [goals] = await Promise.all([api.getGoals(tournamentId, editingMatchForGoals.id)])
      setMatchGoals(goals || [])
      setGoalForm({ player_name: '', team_id: goalForm.team_id, goals: '1' })
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGoal = async (goalId) => {
    try {
      await api.deleteGoal(tournamentId, goalId)
      const [goals] = await Promise.all([api.getGoals(tournamentId, editingMatchForGoals.id)])
      setMatchGoals(goals || [])
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddCard = async (e) => {
    e.preventDefault()
    if (!editingMatchForGoals?.id || !cardForm.player_name || !cardForm.team_id) return
    setSaving(true)
    try {
      await api.addCard(tournamentId, editingMatchForGoals.id, {
        player_name: cardForm.player_name.trim(),
        team_id: cardForm.team_id,
        card_type: cardForm.card_type,
      })
      const [cards] = await Promise.all([api.getCards(tournamentId, editingMatchForGoals.id)])
      setMatchCards(cards || [])
      setCardForm({ player_name: '', team_id: cardForm.team_id, card_type: 'yellow' })
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCard = async (cardId) => {
    try {
      await api.deleteCard(tournamentId, cardId)
      const [cards] = await Promise.all([api.getCards(tournamentId, editingMatchForGoals.id)])
      setMatchCards(cards || [])
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    matchdays.forEach((md) => loadMatchdayMatches(md.id))
  }, [tournamentId, matchdays.map((m) => m.id).join(',')])

  const handleAddTeam = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.createTeam(tournamentId, { name: teamForm.name.trim() || 'Equipo', shield_url: teamForm.shield_url || null })
      setShowTeamModal(false)
      setTeamForm({ name: '', shield_url: '', zone_id: '' })
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('¿Eliminar este equipo?')) return
    try {
      await api.deleteTeam(tournamentId, teamId)
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSaveConfig = async (e) => {
    e.preventDefault()
    setConfigSaving(true)
    setError(null)
    try {
      await api.updateConfig(tournamentId, config)
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setConfigSaving(false)
    }
  }

  const handleGenerateFixture = async () => {
    if (teams.length < 2) {
      setError('Necesitás al menos 2 equipos para generar el fixture.')
      return
    }
    if (!window.confirm(`¿Generar fixture todos contra todos?${config.round_trip ? ' (ida y vuelta)' : ' (solo ida)'} Las jornadas existentes se conservan; solo se crearán las faltantes.`)) return
    setFixtureGenerating(true)
    setError(null)
    try {
      const result = await api.generateFixture(tournamentId, { round_trip: config.round_trip })
      loadAll()
      alert(`Fixture generado: ${result.created.matchdays.length} jornadas nuevas, ${result.created.matches.length} partidos creados.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setFixtureGenerating(false)
    }
  }

  const handleUpdatePlayoffScore = async (matchId, home_score, away_score) => {
    try {
      const bracket = await api.updatePlayoffMatch(tournamentId, matchId, {
        home_score: Number(home_score),
        away_score: Number(away_score),
        status: 'played',
      })
      setPlayoffBracket(Array.isArray(bracket) ? bracket : [])
      setEditingPlayoffMatchId(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleGeneratePlayoff = async () => {
    if (zones.length === 0) {
      setError('Necesitás zonas (grupos) para generar playoffs.')
      return
    }
    if (!window.confirm('¿Generar cuadro de playoffs? Clasificarán los 2 primeros de cada grupo. Se reemplazará cualquier playoff anterior.')) return
    setPlayoffGenerating(true)
    setError(null)
    try {
      const qualify = zones.reduce((acc, z) => ({ ...acc, [z.id]: 2 }), {})
      await api.updateConfig(tournamentId, { ...config, qualify_per_zone: qualify })
      await api.generatePlayoff(tournamentId)
      loadAll()
      setActiveTab('playoffs')
      alert('Playoffs generados. Los 2 primeros de cada grupo pasaron al cuadro (1 vs 4, 2 vs 3).')
    } catch (err) {
      setError(err.message)
    } finally {
      setPlayoffGenerating(false)
    }
  }

  const handleAddMatchday = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.createMatchday(tournamentId, matchdayNumber)
      setShowMatchdayModal(false)
      setMatchdayNumber(matchdays.length + 1)
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddMatch = async (e) => {
    e.preventDefault()
    if (!editingMatchdayId || !matchForm.home_team_id || !matchForm.away_team_id) return
    setSaving(true)
    setError(null)
    try {
      await api.createMatch(tournamentId, editingMatchdayId, {
        home_team_id: matchForm.home_team_id,
        away_team_id: matchForm.away_team_id,
        played_at: matchForm.played_at || null,
      })
      setShowMatchModal(false)
      setEditingMatchdayId(null)
      setMatchForm({ zone_id: '', home_team_id: '', away_team_id: '', played_at: '' })
      loadMatchdayMatches(editingMatchdayId)
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const openMatchModal = (matchdayId) => {
    setEditingMatchdayId(matchdayId)
    const firstZone = zones.length > 0 ? zones[0]?.id : ''
    const zoneTeams = zones.length > 0 ? teams.filter((t) => t.zone_id === firstZone) : teams
    setMatchForm({
      zone_id: firstZone,
      home_team_id: zoneTeams[0]?.id || '',
      away_team_id: zoneTeams[1]?.id || '',
      played_at: '',
    })
    setShowMatchModal(true)
  }

  const handleUpdateMatchScore = async (matchId, home_score, away_score, home_games, away_games) => {
    try {
      const payload = {
        home_score: Number(home_score),
        away_score: Number(away_score),
        status: 'played',
      }
      if (tournament?.sport === 'padel' && (home_games !== '' || away_games !== '')) {
        payload.home_games = home_games === '' ? null : Number(home_games)
        payload.away_games = away_games === '' ? null : Number(away_games)
      }
      await api.updateMatch(tournamentId, matchId, payload)
      loadAll()
      setMatchdays((prev) => prev.map((md) => {
        if (matchdayMatches[md.id]) {
          return { ...md }
        }
        return md
      }))
      setMatchdayMatches((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((mdId) => {
          next[mdId] = next[mdId].map((m) => {
            if (m.id === matchId) return { ...m, home_score: Number(home_score), away_score: Number(away_score), home_games: home_games !== '' ? Number(home_games) : null, away_games: away_games !== '' ? Number(away_games) : null, status: 'played' }
            return m
          })
        })
        return next
      })
      setEditingMatchId(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const formatDate = (d) => {
    if (!d) return '—'
    try {
      return new Date(d).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    } catch {
      return d
    }
  }

  if (!tournament) {
    return (
      <Container className="py-5">
        <Alert variant="warning">Torneo no encontrado.</Alert>
        <Link to="/admin">Volver al panel</Link>
      </Container>
    )
  }

  const isPadel = tournament.sport === 'padel'
  const teamLabel = isPadel ? 'Pareja' : 'Equipo'
  const teamsLabel = isPadel ? 'Parejas' : 'Equipos'
  const zoneLabel = isPadel ? 'Grupo' : 'Zona'
  const zonesLabel = isPadel ? 'Grupos' : 'Zonas'
  const rosterLabel = isPadel ? 'Integrantes' : 'Plantel'
  const adminLabel = tournament.modality === 'grupo' ? 'Administrar fase de grupos' : 'Administrar liga'
  const isLigaFormat = tournament?.modality === 'liga' // Formato Liga: solo tabla, sin playoffs

  return (
    <div className="league-page">
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
        <Container>
          <Navbar.Brand as={Link} to="/admin">Spectra Admin</Navbar.Brand>
          <Nav className="ms-auto">
            <Nav.Link as={Link} to={`/torneo/${tournamentId}`}>Ver público</Nav.Link>
            <Nav.Link as={Link} to="/admin">Panel</Nav.Link>
          </Nav>
        </Container>
      </Navbar>

      <Container className="py-4">
        <div className="league-header">
          <h1>{tournament.name}</h1>
          <p className="subtitle mb-0">{adminLabel} · {teamsLabel}, {rosterLabel.toLowerCase()}, fixture y resultados</p>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">{error}</Alert>
        )}

        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" /></div>
        ) : (
          <>
            <div className="league-steps mb-3">
              <span className="league-step active">
                <span className="league-step-num">1</span> {teamsLabel}
              </span>
              <span className="league-step">→</span>
              <span className="league-step">
                <span className="league-step-num">2</span> {zonesLabel}
              </span>
              <span className="league-step">→</span>
              <span className="league-step">
                <span className="league-step-num">3</span> Config
              </span>
              <span className="league-step">→</span>
              <span className="league-step">
                <span className="league-step-num">4</span> Fixture
              </span>
              <span className="league-step">→</span>
              <span className="league-step">
                <span className="league-step-num">5</span> Partidos
              </span>
              {!isLigaFormat && (
                <>
                  <span className="league-step">→</span>
                  <span className="league-step">
                    <span className="league-step-num">6</span> Playoffs
                  </span>
                </>
              )}
            </div>
            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'teams')} className="league-tabs mb-4">
            <Tab eventKey="teams" title={`1. ${teamsLabel}`}>
              {teams.length >= 2 && (
                <Card className="mb-3">
                  <Card.Header>Sortear y crear {zonesLabel.toLowerCase()}</Card.Header>
                  <Card.Body>
                    <p className="text-muted small mb-2">
                      Creá la cantidad de {zonesLabel.toLowerCase()} que quieras y las {teams.length} {teamsLabel.toLowerCase()} se sortearán al azar entre ellas.
                    </p>
                    <Form onSubmit={handleDrawZones} className="d-flex align-items-end flex-wrap gap-2">
                      <Form.Group className="mb-0">
                        <Form.Label className="small mb-1">Cantidad de {zonesLabel.toLowerCase()}</Form.Label>
                        <Form.Control
                          type="number"
                          min={1}
                          max={teams.length}
                          value={drawZonesNum}
                          onChange={(e) => setDrawZonesNum(Number(e.target.value) || 2)}
                          style={{ width: '5rem' }}
                        />
                      </Form.Group>
                      <Button type="submit" variant="outline-primary" size="sm" disabled={drawZonesLoading}>
                        {drawZonesLoading ? 'Sorteando…' : `Sortear y crear ${zonesLabel.toLowerCase()}`}
                      </Button>
                    </Form>
                  </Card.Body>
                </Card>
              )}
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <span>{teamsLabel} y {rosterLabel.toLowerCase()}</span>
                  <Button size="sm" variant="primary" onClick={() => { setTeamForm({ name: '', shield_url: '', zone_id: '' }); setShowTeamModal(true); }}>
                    + Agregar {teamLabel.toLowerCase()}
                  </Button>
                </Card.Header>
                <Card.Body className="p-0">
                  {teams.length === 0 ? (
                    <div className="league-empty">
                      <div className="league-empty-icon">{isPadel ? '🎾' : '⚽'}</div>
                      <p className="mb-2">Aún no hay {teamsLabel.toLowerCase()}.</p>
                      <p className="league-hint mb-0">{isPadel ? 'Agregá parejas y cargá los 2 integrantes de cada una.' : 'Agregá equipos y luego cargá los jugadores de cada uno.'}</p>
                    </div>
                  ) : (
                    <Table responsive hover className="mb-0">
                      <thead className="table-light">
                        <tr><th>Nombre</th><th>{zoneLabel}</th><th>Escudo</th><th>{rosterLabel}</th><th></th></tr>
                      </thead>
                      <tbody>
                        {teams.map((t) => (
                          <tr key={t.id}>
                            <td className="fw-medium">{t.name}</td>
                            <td><span className="text-muted">{t.zone_name || '—'}</span></td>
                            <td>{t.shield_url ? <a href={t.shield_url} target="_blank" rel="noreferrer" className="small">Ver</a> : '—'}</td>
                            <td>
                              <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={() => openPlayersModal(t)}>
                                {rosterLabel}
                              </Button>
                            </td>
                            <td>
                              <Button variant="outline-danger" size="sm" onClick={() => handleDeleteTeam(t.id)}>Eliminar</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Tab>
            <Tab eventKey="zones" title={`2. ${zonesLabel}`}>
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <span>{zonesLabel}</span>
                  <Button size="sm" variant="primary" onClick={() => { setZoneForm({ name: '', sort_order: zones.length }); setShowZoneModal(true); }}>
                    + Nueva {zoneLabel.toLowerCase()}
                  </Button>
                </Card.Header>
                <Card.Body className="p-0">
                  {zones.length === 0 ? (
                    <div className="league-empty">
                      <div className="league-empty-icon">🗂️</div>
                      <p className="mb-2">Sin {zonesLabel.toLowerCase()} definid{isPadel ? 'os' : 'as'}.</p>
                      <p className="league-hint mb-0">Opcional: creá {zonesLabel.toLowerCase()} para dividir el torneo.</p>
                    </div>
                  ) : (
                    <Table responsive className="mb-0">
                      <thead className="table-light">
                        <tr><th>Nombre</th><th>Orden</th><th></th></tr>
                      </thead>
                      <tbody>
                        {zones.map((z) => (
                          <tr key={z.id}>
                            <td>{z.name}</td>
                            <td>{z.sort_order}</td>
                            <td>
                              <Button variant="outline-danger" size="sm" onClick={() => handleDeleteZone(z.id)}>Eliminar</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Tab>
            <Tab eventKey="config" title="3. Configuración">
              <Card>
                <Card.Header>Sistema de puntos y formato</Card.Header>
                <Card.Body>
                  <Form onSubmit={handleSaveConfig}>
                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Puntos por victoria</Form.Label>
                          <Form.Control
                            type="number"
                            min={0}
                            value={config.points_win ?? 3}
                            onChange={(e) => setConfig((c) => ({ ...c, points_win: Number(e.target.value) }))}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Puntos por empate</Form.Label>
                          <Form.Control
                            type="number"
                            min={0}
                            value={config.points_draw ?? 1}
                            onChange={(e) => setConfig((c) => ({ ...c, points_draw: Number(e.target.value) }))}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Puntos por derrota</Form.Label>
                          <Form.Control
                            type="number"
                            min={0}
                            value={config.points_loss ?? 0}
                            onChange={(e) => setConfig((c) => ({ ...c, points_loss: Number(e.target.value) }))}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        id="round_trip"
                        label={isPadel ? 'Ida y vuelta (cada pareja juega dos veces contra cada rival)' : 'Ida y vuelta (cada equipo juega dos veces contra cada rival)'}
                        checked={!!config.round_trip}
                        onChange={(e) => setConfig((c) => ({ ...c, round_trip: e.target.checked }))}
                      />
                      <Form.Text className="text-muted">
                        Liga simple: {teams.length > 0 ? teams.length - 1 : 'N-1'} jornadas · Ida y vuelta: {teams.length > 0 ? 2 * (teams.length - 1) : '2×(N-1)'} jornadas
                      </Form.Text>
                    </Form.Group>
                    <Button type="submit" variant="primary" disabled={configSaving}>
                      {configSaving ? 'Guardando…' : 'Guardar configuración'}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Tab>
            <Tab eventKey="matchdays" title="4. Jornadas">
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <span>Fixtures y partidos</span>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleGenerateFixture}
                      disabled={fixtureGenerating || teams.length < 2}
                    >
                      {fixtureGenerating ? 'Generando…' : 'Generar fixture'}
                    </Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => { setMatchdayNumber(matchdays.length + 1); setShowMatchdayModal(true); }}>
                      + Jornada manual
                    </Button>
                    {!isLigaFormat && zones.length > 0 && matchdays.length > 0 && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={handleGeneratePlayoff}
                        disabled={playoffGenerating}
                        title="Clasifican los 2 primeros de cada grupo"
                      >
                        {playoffGenerating ? 'Generando…' : 'Generar playoffs (2 por grupo)'}
                      </Button>
                    )}
                  </div>
                </Card.Header>
                <Card.Body>
                  {matchdays.map((md) => (
                    <Card key={md.id} className="mb-3">
                      <Card.Header className="d-flex justify-content-between align-items-center">
                        <span>Jornada {md.number}</span>
                        <Button size="sm" variant="outline-primary" onClick={() => openMatchModal(md.id)}>
                          Agregar partido
                        </Button>
                      </Card.Header>
                      <Card.Body className="p-0">
                        {(() => {
                          const allMatches = matchdayMatches[md.id] || []
                          const groups = zones.length > 0
                            ? zones.map((z) => ({ zone: z, matches: allMatches.filter((m) => m.zone_id === z.id || m.zone_name === z.name) })).filter((g) => g.matches.length > 0)
                            : [{ zone: null, matches: allMatches }]
                          if (zones.length > 0 && groups.length === 0 && allMatches.length > 0) {
                            groups.push({ zone: null, matches: allMatches })
                          }
                          return groups.map(({ zone, matches: zoneMatches }) => (
                            <div key={zone?.id || '_all'} className={zone ? 'mb-3' : ''}>
                              {zone && (
                                <div className="px-3 py-2 bg-light border-bottom small fw-semibold">{zone.name}</div>
                              )}
                              <Table responsive className="mb-0">
                                <thead className="table-light">
                                  <tr><th className="text-end">Local</th><th className="text-center">Resultado</th><th>Visitante</th><th>Fecha</th><th></th></tr>
                                </thead>
                                <tbody>
                                  {zoneMatches.map((m) => (
                              <tr key={m.id}>
                                <td className="text-end">{m.home_team_name}</td>
                                <td className="text-center">
                                  {editingMatchId === m.id ? (
                                    <span className="d-inline-flex flex-wrap align-items-center gap-1">
                                      <span title={isPadel ? 'Sets' : 'Resultado'}>
                                        <Form.Control
                                          type="number"
                                          size="sm"
                                          style={{ width: 50 }}
                                          value={matchScoreForm.home_score}
                                          onChange={(e) => setMatchScoreForm((f) => ({ ...f, home_score: e.target.value }))}
                                        />
                                        -
                                        <Form.Control
                                          type="number"
                                          size="sm"
                                          style={{ width: 50 }}
                                          value={matchScoreForm.away_score}
                                          onChange={(e) => setMatchScoreForm((f) => ({ ...f, away_score: e.target.value }))}
                                        />
                                      </span>
                                      {isPadel && (
                                        <span title="Games" className="text-muted small">
                                          (
                                          <Form.Control
                                            type="number"
                                            size="sm"
                                            style={{ width: 45 }}
                                            placeholder="G"
                                            value={matchScoreForm.home_games}
                                            onChange={(e) => setMatchScoreForm((f) => ({ ...f, home_games: e.target.value }))}
                                          />
                                          -
                                          <Form.Control
                                            type="number"
                                            size="sm"
                                            style={{ width: 45 }}
                                            placeholder="G"
                                            value={matchScoreForm.away_games}
                                            onChange={(e) => setMatchScoreForm((f) => ({ ...f, away_games: e.target.value }))}
                                          />
                                          )
                                        </span>
                                      )}
                                      <Button size="sm" onClick={() => handleUpdateMatchScore(m.id, matchScoreForm.home_score, matchScoreForm.away_score, matchScoreForm.home_games, matchScoreForm.away_games)}>Guardar</Button>
                                      <Button size="sm" variant="outline-secondary" onClick={() => setEditingMatchId(null)}>Cancelar</Button>
                                    </span>
                                  ) : m.status === 'played' ? (
                                    <span>
                                      {m.home_score ?? 0} - {m.away_score ?? 0}
                                      {isPadel && m.home_games != null && m.away_games != null && (
                                        <span className="text-muted small ms-1">({m.home_games}-{m.away_games})</span>
                                      )}
                                      <Button variant="link" size="sm" className="p-0 ms-1" onClick={() => { setEditingMatchId(m.id); setMatchScoreForm({ home_score: m.home_score ?? '', away_score: m.away_score ?? '', home_games: m.home_games ?? '', away_games: m.away_games ?? '' }); }}>
                                        Editar
                                      </Button>
                                    </span>
                                  ) : (
                                    <Button size="sm" variant="outline-secondary" onClick={() => { setEditingMatchId(m.id); setMatchScoreForm({ home_score: '', away_score: '', home_games: '', away_games: '' }); }}>
                                      Cargar resultado
                                    </Button>
                                  )}
                                </td>
                                <td>{m.away_team_name}</td>
                                <td className="text-muted small">{formatDate(m.played_at)}</td>
                                <td>
                                  {!isPadel && (
                                  <Button variant="link" size="sm" className="p-0" onClick={() => openGoalsCardsModal(m)}>
                                    Goles y tarjetas
                                  </Button>
                                  )}
                                </td>
                              </tr>
                                  ))}
                                </tbody>
                              </Table>
                            </div>
                          ))
                        })()}
                        {(!matchdayMatches[md.id] || matchdayMatches[md.id].length === 0) && (
                          <div className="league-empty py-3"><p className="mb-0 small">Sin partidos. Agregá uno con el botón de arriba.</p></div>
                        )}
                      </Card.Body>
                    </Card>
                  ))}
                  {matchdays.length === 0 && (
                    <div className="league-empty">
                      <div className="league-empty-icon">📅</div>
                      <p className="mb-0">Sin jornadas. Generá el fixture o creá una jornada manual.</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Tab>
            {!isPadel && (
            <Tab eventKey="scorers" title="Goleadores">
              <Card>
                <Card.Header className="fw-bold">Tabla de goleadores</Card.Header>
                <Card.Body className="p-0">
                  {scorers.length === 0 ? (
                    <div className="league-empty"><div className="league-empty-icon">⚽</div><p className="mb-0">Sin goles cargados. Agregá goles desde cada partido (Goles y tarjetas).</p></div>
                  ) : (
                    <Table responsive hover className="mb-0">
                      <thead className="table-light">
                        <tr><th>#</th><th>Jugador</th><th>Equipo</th><th>Goles</th></tr>
                      </thead>
                      <tbody>
                        {scorers.map((row) => (
                          <tr key={`${row.player_name}-${row.team_id}`}>
                            <td className="fw-semibold">{row.position}</td>
                            <td>{row.player_name}</td>
                            <td>{row.team_name}</td>
                            <td>{row.goals}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Tab>
            )}
            {!isPadel && (
            <Tab eventKey="discipline" title="Tarjetas">
              <Card>
                <Card.Header className="fw-bold">Tabla de tarjetas (disciplina)</Card.Header>
                <Card.Body className="p-0">
                  {discipline.length === 0 ? (
                    <div className="league-empty"><div className="league-empty-icon">🟨</div><p className="mb-0">Sin tarjetas registradas. Agregá tarjetas desde cada partido (Goles y tarjetas).</p></div>
                  ) : (
                    <Table responsive hover className="mb-0">
                      <thead className="table-light">
                        <tr><th>Jugador</th><th>Equipo</th><th>🟨 Amarillas</th><th>🟥 Rojas</th></tr>
                      </thead>
                      <tbody>
                        {discipline.map((row, i) => (
                          <tr key={i}>
                            <td>{row.player_name}</td>
                            <td>{row.team_name}</td>
                            <td>{row.yellow}</td>
                            <td>{row.red}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
            </Tab>
            )}
            {!isLigaFormat && (
            <Tab eventKey="playoffs" title="Playoffs">
              {playoffBracket.length === 0 ? (
                <Card>
                  <Card.Body className="py-5 text-center text-muted">
                    <p className="mb-2">Aún no hay cuadro de playoffs.</p>
                    <p className="mb-0 small">Completá las jornadas y usá el botón «Generar playoffs (2 por grupo)» en la pestaña Jornadas.</p>
                  </Card.Body>
                </Card>
              ) : (
                playoffBracket.map((round) => (
                  <Card key={round.id} className="mb-3">
                    <Card.Header className="fw-bold">{round.name}</Card.Header>
                    <Card.Body className="p-0">
                      <Table responsive className="mb-0">
                        <thead className="table-light">
                          <tr><th className="text-end">Local</th><th className="text-center">Resultado</th><th>Visitante</th><th></th></tr>
                        </thead>
                        <tbody>
                          {(round.matches || []).map((m) => (
                            <tr key={m.id}>
                              <td className="text-end">{m.home_team_name || m.home_slot || '—'}</td>
                              <td className="text-center">
                                {editingPlayoffMatchId === m.id ? (
                                  <span className="d-inline-flex align-items-center gap-1">
                                    <Form.Control
                                      type="number"
                                      size="sm"
                                      style={{ width: 50 }}
                                      value={matchScoreForm.home_score}
                                      onChange={(e) => setMatchScoreForm((f) => ({ ...f, home_score: e.target.value }))}
                                    />
                                    -
                                    <Form.Control
                                      type="number"
                                      size="sm"
                                      style={{ width: 50 }}
                                      value={matchScoreForm.away_score}
                                      onChange={(e) => setMatchScoreForm((f) => ({ ...f, away_score: e.target.value }))}
                                    />
                                    <Button size="sm" onClick={() => handleUpdatePlayoffScore(m.id, matchScoreForm.home_score, matchScoreForm.away_score)}>Guardar</Button>
                                    <Button size="sm" variant="outline-secondary" onClick={() => setEditingPlayoffMatchId(null)}>Cancelar</Button>
                                  </span>
                                ) : m.status === 'played' ? (
                                  <span>
                                    {m.home_score ?? 0} - {m.away_score ?? 0}
                                    <Button variant="link" size="sm" className="p-0 ms-1" onClick={() => { setEditingPlayoffMatchId(m.id); setMatchScoreForm({ home_score: m.home_score ?? '', away_score: m.away_score ?? '' }); }}>
                                      Editar
                                    </Button>
                                  </span>
                                ) : (
                                  <Button size="sm" variant="outline-secondary" onClick={() => { setEditingPlayoffMatchId(m.id); setMatchScoreForm({ home_score: '', away_score: '' }); }}>
                                    Cargar resultado
                                  </Button>
                                )}
                              </td>
                              <td>{m.away_team_name || m.away_slot || '—'}</td>
                              <td></td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                ))
              )}
            </Tab>
            )}
            <Tab eventKey="standings" title="Tabla de posiciones">
              {zones.length > 0 ? (
                zones.map((zone) => {
                  const zoneStandings = standingsByZone[zone.id] || []
                  return (
                    <Card key={zone.id} className="mb-3">
                      <Card.Header className="fw-bold">{zone.name} — Tabla de posiciones</Card.Header>
                      <Card.Body className="p-0">
                        {zoneStandings.length === 0 ? (
                          <div className="league-empty py-4 text-muted small">Sin partidos jugados en {isPadel ? 'este grupo' : 'esta zona'}.</div>
                        ) : (
                          <Table responsive hover className="mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>#</th><th>{teamLabel}</th><th>PJ</th><th>PG</th>
                                {!isPadel && <th>PE</th>}
                                <th>PP</th>
                                <th>{isPadel ? 'SF' : 'GF'}</th><th>{isPadel ? 'SC' : 'GC'}</th><th>{isPadel ? 'DS' : 'DG'}</th>
                                {isPadel && <><th>GF</th><th>GC</th><th>DG</th></>}
                                <th>Pts</th>
                              </tr>
                            </thead>
                            <tbody>
                              {zoneStandings.map((row) => (
                                <tr key={row.team_id}>
                                  <td className="fw-semibold">{row.position}</td>
                                  <td>{row.team_name}</td>
                                  <td>{row.played}</td>
                                  <td>{row.won}</td>
                                  {!isPadel && <td>{row.drawn}</td>}
                                  <td>{row.lost}</td>
                                  <td>{row.goals_for}</td>
                                  <td>{row.goals_against}</td>
                                  <td>{row.goal_diff}</td>
                                  {isPadel && <>
                                    <td>{row.games_for ?? 0}</td>
                                    <td>{row.games_against ?? 0}</td>
                                    <td>{row.games_diff ?? 0}</td>
                                  </>}
                                  <td className="fw-semibold">{row.points}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        )}
                      </Card.Body>
                    </Card>
                  )
                })
              ) : (
                <Card>
                  <Card.Header className="fw-bold">Tabla de posiciones (calculada)</Card.Header>
                  <Card.Body className="p-0">
                    <Table responsive hover className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>#</th><th>{teamLabel}</th><th>PJ</th><th>PG</th>
                          {!isPadel && <th>PE</th>}
                          <th>PP</th>
                          <th>{isPadel ? 'SF' : 'GF'}</th><th>{isPadel ? 'SC' : 'GC'}</th><th>{isPadel ? 'DS' : 'DG'}</th>
                          {isPadel && <><th>GF</th><th>GC</th><th>DG</th></>}
                          <th>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((row) => (
                          <tr key={row.team_id}>
                            <td className="fw-semibold">{row.position}</td>
                            <td>{row.team_name}</td>
                            <td>{row.played}</td>
                            <td>{row.won}</td>
                            {!isPadel && <td>{row.drawn}</td>}
                            <td>{row.lost}</td>
                            <td>{row.goals_for}</td>
                            <td>{row.goals_against}</td>
                            <td>{row.goal_diff}</td>
                            {isPadel && <>
                              <td>{row.games_for ?? 0}</td>
                              <td>{row.games_against ?? 0}</td>
                              <td>{row.games_diff ?? 0}</td>
                            </>}
                            <td className="fw-semibold">{row.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              )}
            </Tab>
          </Tabs>
          </>
        )}

        <Modal show={showTeamModal} onHide={() => !saving && setShowTeamModal(false)}>
          <Modal.Header closeButton><Modal.Title>Nuev{isPadel ? 'a pareja' : 'o equipo'}</Modal.Title></Modal.Header>
          <Form onSubmit={handleAddTeam}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Nombre</Form.Label>
                <Form.Control value={teamForm.name} onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))} placeholder={isPadel ? "Ej: López / Martínez" : "Nombre del equipo"} />
              </Form.Group>
              {zones.length > 0 && (
                <Form.Group className="mb-3">
                  <Form.Label>{zoneLabel}</Form.Label>
                  <Form.Select value={teamForm.zone_id} onChange={(e) => setTeamForm((f) => ({ ...f, zone_id: e.target.value || '' }))}>
                    <option value="">Sin {zoneLabel.toLowerCase()}</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              )}
              <Form.Group className="mb-3">
                <Form.Label>URL del escudo (opcional)</Form.Label>
                <Form.Control value={teamForm.shield_url} onChange={(e) => setTeamForm((f) => ({ ...f, shield_url: e.target.value }))} placeholder="https://..." />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowTeamModal(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Agregar'}</Button>
            </Modal.Footer>
          </Form>
        </Modal>

        <Modal show={showPlayersModal} onHide={() => { if (!saving) { setShowPlayersModal(false); setEditingTeamForPlayers(null); } }} className="league-modal-players">
          <Modal.Header closeButton>
            <Modal.Title>Jugadores — {editingTeamForPlayers?.name}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="league-players-intro">Cargá los jugadores del equipo para asignarlos en goles y tarjetas.</p>
            <div className="league-players-list">
              <Table size="sm" className="league-players-table" borderless>
                <thead>
                  <tr>
                    <th className="league-players-table__th league-players-table__th--name">Nombre</th>
                    <th className="league-players-table__th league-players-table__th--dni">DNI</th>
                    <th className="league-players-table__th league-players-table__th--num">N°</th>
                    <th className="league-players-table__th league-players-table__th--role">Rol</th>
                    <th className="league-players-table__th league-players-table__th--actions" />
                  </tr>
                </thead>
                <tbody>
                  {teamPlayers.map((p) => (
                    editingPlayerId === p.id ? (
                      <tr key={p.id} className="league-player-row league-player-row--editing">
                        <td className="league-players-table__td"><Form.Control size="sm" placeholder="Nombre" value={editPlayerForm.player_name} onChange={(e) => setEditPlayerForm((f) => ({ ...f, player_name: e.target.value }))} className="league-player-row__input-name" /></td>
                        <td className="league-players-table__td"><Form.Control size="sm" placeholder="DNI" value={editPlayerForm.dni} onChange={(e) => setEditPlayerForm((f) => ({ ...f, dni: e.target.value }))} className="league-player-row__input-dni" /></td>
                        <td className="league-players-table__td"><Form.Control size="sm" type="number" placeholder="N°" value={editPlayerForm.shirt_number} onChange={(e) => setEditPlayerForm((f) => ({ ...f, shirt_number: e.target.value }))} className="league-player-row__input-num" /></td>
                        <td className="league-players-table__td"><Form.Select size="sm" value={editPlayerForm.role} onChange={(e) => setEditPlayerForm((f) => ({ ...f, role: e.target.value }))} className="league-player-row__input-role"><option value="captain">Capitán</option><option value="player">Jugador</option><option value="guest">Invitado</option></Form.Select></td>
                        <td className="league-players-table__td league-players-table__td--actions">
                          <Button variant="link" size="sm" className="league-player-row__btn-save" onClick={handleSavePlayer}>Guardar</Button>
                          <Button variant="link" size="sm" className="league-player-row__btn-cancel" onClick={cancelEditPlayer}>Cancelar</Button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={p.id} className="league-player-row">
                        <td className="league-players-table__td league-players-table__td--name"><strong>{p.player_name}</strong></td>
                        <td className="league-players-table__td league-players-table__td--dni">{p.dni || '—'}</td>
                        <td className="league-players-table__td league-players-table__td--num">{p.shirt_number ?? '—'}</td>
                        <td className="league-players-table__td league-players-table__td--role">{roleLabel(p.role)}</td>
                        <td className="league-players-table__td league-players-table__td--actions">
                          <Button variant="link" size="sm" className="league-player-row__btn-edit" onClick={() => startEditPlayer(p)}>Editar</Button>
                          <Button variant="link" size="sm" className="league-player-row__btn-delete" onClick={() => handleDeletePlayer(p.id)}>Eliminar</Button>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </Table>
            </div>
            <Form onSubmit={handleAddPlayer} className="league-players-add-form">
              <div className="league-players-add-form__row league-players-add-form__row--labels">
                <label className="league-players-add-form__label" htmlFor="player-name">Nombre</label>
                <label className="league-players-add-form__label" htmlFor="player-dni">DNI</label>
                <label className="league-players-add-form__label" htmlFor="player-shirt">N°</label>
                <label className="league-players-add-form__label" htmlFor="player-role">Rol</label>
                <span className="league-players-add-form__label league-players-add-form__label--empty" />
              </div>
              <div className="league-players-add-form__row league-players-add-form__row--inputs">
                <Form.Control
                  id="player-name"
                  placeholder="Nombre y apellido"
                  value={playerForm.player_name}
                  onChange={(e) => setPlayerForm((f) => ({ ...f, player_name: e.target.value }))}
                  className="league-players-add-form__name"
                />
                <Form.Control
                  id="player-dni"
                  placeholder="8 dígitos"
                  value={playerForm.dni}
                  onChange={(e) => setPlayerForm((f) => ({ ...f, dni: e.target.value }))}
                  className="league-players-add-form__dni"
                />
                <Form.Control
                  id="player-shirt"
                  type="number"
                  placeholder="N°"
                  value={playerForm.shirt_number}
                  onChange={(e) => setPlayerForm((f) => ({ ...f, shirt_number: e.target.value }))}
                  className="league-players-add-form__num"
                />
                <Form.Select
                  id="player-role"
                  value={playerForm.role}
                  onChange={(e) => setPlayerForm((f) => ({ ...f, role: e.target.value }))}
                  className="league-players-add-form__role"
                >
                  <option value="captain">Capitán</option>
                  <option value="player">Jugador</option>
                  <option value="guest">Invitado</option>
                </Form.Select>
                <Button type="submit" size="sm" className="league-players-add-form__btn" disabled={saving || !playerForm.player_name?.trim()}>Agregar</Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        <Modal show={showGoalsCardsModal} onHide={() => { if (!saving) { setShowGoalsCardsModal(false); setEditingMatchForGoals(null); } }} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              Goles y tarjetas — {editingMatchForGoals?.home_team_name} vs {editingMatchForGoals?.away_team_name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <h6 className="mt-2">Goles</h6>
            <Table size="sm" className="mb-3">
              <thead><tr><th>Jugador</th><th>Equipo</th><th>Goles</th><th></th></tr></thead>
              <tbody>
                {matchGoals.map((g) => (
                  <tr key={g.id}>
                    <td>{g.player_name}</td>
                    <td>{g.team_name}</td>
                    <td>{g.goals ?? 1}</td>
                    <td>
                      <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDeleteGoal(g.id)}>Eliminar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Form onSubmit={handleAddGoal} className="d-flex flex-wrap gap-2 align-items-end mb-4">
              <Form.Select
                value={goalForm.team_id}
                onChange={(e) => setGoalForm((f) => ({ ...f, team_id: e.target.value, player_name: '' }))}
                style={{ width: 150 }}
              >
                <option value="">Equipo</option>
                {editingMatchForGoals && [
                  { id: editingMatchForGoals.home_team_id, name: editingMatchForGoals.home_team_name },
                  { id: editingMatchForGoals.away_team_id, name: editingMatchForGoals.away_team_name },
                ].map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Form.Select>
              {goalForm.team_id && (
                (playersByTeam[goalForm.team_id] || []).length > 0 ? (
                  <Form.Select
                    value={goalForm.player_name}
                    onChange={(e) => setGoalForm((f) => ({ ...f, player_name: e.target.value }))}
                    style={{ width: 180 }}
                    required
                  >
                    <option value="">Seleccionar jugador</option>
                    {(playersByTeam[goalForm.team_id] || []).map((p) => (
                      <option key={p.id} value={p.player_name}>
                        {p.shirt_number ? `${p.shirt_number}. ` : ''}{p.player_name}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  <Form.Control
                    placeholder="Jugador (cargar plantel en Equipos)"
                    value={goalForm.player_name}
                    onChange={(e) => setGoalForm((f) => ({ ...f, player_name: e.target.value }))}
                    style={{ width: 200 }}
                  />
                )
              )}
              <Form.Control
                type="number"
                min={1}
                placeholder="Goles"
                value={goalForm.goals}
                onChange={(e) => setGoalForm((f) => ({ ...f, goals: e.target.value }))}
                style={{ width: 70 }}
              />
              <Button type="submit" size="sm" disabled={saving || !goalForm.player_name?.trim() || !goalForm.team_id}>Agregar gol</Button>
            </Form>

            <h6>Tarjetas</h6>
            <Table size="sm" className="mb-3">
              <thead><tr><th>Jugador</th><th>Equipo</th><th>Tipo</th><th></th></tr></thead>
              <tbody>
                {matchCards.map((c) => (
                  <tr key={c.id}>
                    <td>{c.player_name}</td>
                    <td>{c.team_name}</td>
                    <td>{c.card_type === 'yellow' ? '🟨 Amarilla' : '🟥 Roja'}</td>
                    <td>
                      <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDeleteCard(c.id)}>Eliminar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Form onSubmit={handleAddCard} className="d-flex flex-wrap gap-2 align-items-end">
              <Form.Select
                value={cardForm.team_id}
                onChange={(e) => setCardForm((f) => ({ ...f, team_id: e.target.value, player_name: '' }))}
                style={{ width: 150 }}
              >
                <option value="">Equipo</option>
                {editingMatchForGoals && [
                  { id: editingMatchForGoals.home_team_id, name: editingMatchForGoals.home_team_name },
                  { id: editingMatchForGoals.away_team_id, name: editingMatchForGoals.away_team_name },
                ].map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Form.Select>
              {cardForm.team_id && (
                (playersByTeam[cardForm.team_id] || []).length > 0 ? (
                  <Form.Select
                    value={cardForm.player_name}
                    onChange={(e) => setCardForm((f) => ({ ...f, player_name: e.target.value }))}
                    style={{ width: 180 }}
                    required
                  >
                    <option value="">Seleccionar jugador</option>
                    {(playersByTeam[cardForm.team_id] || []).map((p) => (
                      <option key={p.id} value={p.player_name}>
                        {p.shirt_number ? `${p.shirt_number}. ` : ''}{p.player_name}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  <Form.Control
                    placeholder="Jugador (cargar plantel en Equipos)"
                    value={cardForm.player_name}
                    onChange={(e) => setCardForm((f) => ({ ...f, player_name: e.target.value }))}
                    style={{ width: 200 }}
                  />
                )
              )}
              <Form.Select
                value={cardForm.card_type}
                onChange={(e) => setCardForm((f) => ({ ...f, card_type: e.target.value }))}
                style={{ width: 120 }}
              >
                <option value="yellow">🟨 Amarilla</option>
                <option value="red">🟥 Roja</option>
              </Form.Select>
              <Button type="submit" size="sm" disabled={saving || !cardForm.player_name?.trim() || !cardForm.team_id}>Agregar tarjeta</Button>
            </Form>
          </Modal.Body>
        </Modal>

        <Modal show={showZoneModal} onHide={() => !saving && setShowZoneModal(false)}>
          <Modal.Header closeButton><Modal.Title>Nuev{isPadel ? 'o grupo' : 'a zona'}</Modal.Title></Modal.Header>
          <Form onSubmit={handleAddZone}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Nombre</Form.Label>
                <Form.Control value={zoneForm.name} onChange={(e) => setZoneForm((f) => ({ ...f, name: e.target.value }))} placeholder={isPadel ? "Grupo A, Grupo 1, etc." : "Zona A, Grupo 1, etc."} />
              </Form.Group>
              <Form.Group>
                <Form.Label>Orden</Form.Label>
                <Form.Control type="number" min={0} value={zoneForm.sort_order} onChange={(e) => setZoneForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowZoneModal(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Crear'}</Button>
            </Modal.Footer>
          </Form>
        </Modal>

        <Modal show={showMatchdayModal} onHide={() => !saving && setShowMatchdayModal(false)}>
          <Modal.Header closeButton><Modal.Title>Nueva jornada</Modal.Title></Modal.Header>
          <Form onSubmit={handleAddMatchday}>
            <Modal.Body>
              <Form.Group>
                <Form.Label>Número de jornada</Form.Label>
                <Form.Control type="number" min={1} value={matchdayNumber} onChange={(e) => setMatchdayNumber(Number(e.target.value))} />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowMatchdayModal(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Crear'}</Button>
            </Modal.Footer>
          </Form>
        </Modal>

        <Modal show={showMatchModal} onHide={() => !saving && setShowMatchModal(false)}>
          <Modal.Header closeButton><Modal.Title>Nuevo partido</Modal.Title></Modal.Header>
          <Form onSubmit={handleAddMatch}>
            <Modal.Body>
              {zones.length > 0 && (
                <Form.Group className="mb-3">
                  <Form.Label>{zoneLabel}</Form.Label>
                  <Form.Select
                    value={matchForm.zone_id}
                    onChange={(e) => {
                      const zId = e.target.value
                      const zTeams = teams.filter((t) => t.zone_id === zId)
                      setMatchForm((f) => ({ ...f, zone_id: zId, home_team_id: zTeams[0]?.id || '', away_team_id: zTeams[1]?.id || '' }))
                    }}
                    required
                  >
                    <option value="">Seleccionar {zoneLabel.toLowerCase()}</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              )}
              {(() => {
                const teamsForMatch = zones.length > 0 && matchForm.zone_id
                  ? teams.filter((t) => t.zone_id === matchForm.zone_id)
                  : teams
                return (
                  <>
                    <Form.Group className="mb-3">
                      <Form.Label>Local</Form.Label>
                      <Form.Select value={matchForm.home_team_id} onChange={(e) => setMatchForm((f) => ({ ...f, home_team_id: e.target.value }))} required>
                        <option value="">Seleccionar</option>
                        {teamsForMatch.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Visitante</Form.Label>
                      <Form.Select value={matchForm.away_team_id} onChange={(e) => setMatchForm((f) => ({ ...f, away_team_id: e.target.value }))} required>
                        <option value="">Seleccionar</option>
                        {teamsForMatch.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </>
                )
              })()}
              <Form.Group className="mb-3">
                <Form.Label>Fecha y hora (opcional)</Form.Label>
                <Form.Control type="datetime-local" value={matchForm.played_at} onChange={(e) => setMatchForm((f) => ({ ...f, played_at: e.target.value }))} />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowMatchModal(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving || !matchForm.home_team_id || !matchForm.away_team_id || (zones.length > 0 && !matchForm.zone_id)}>{saving ? 'Guardando…' : 'Agregar'}</Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </Container>
    </div>
  )
}
