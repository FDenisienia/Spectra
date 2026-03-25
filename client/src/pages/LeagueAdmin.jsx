import { useState, useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Container, Navbar, Nav, Card, Table, Button, Spinner, Alert, Modal, Form, Tabs, Tab, Row, Col } from 'react-bootstrap'
import * as api from '../api/league'
import { playedAtToDatetimeLocal } from '../utils/matchDateTime'
import * as tournamentApi from '../api/tournament'
import { isLeagueFormat } from '../utils/tournamentFormat'
import {
  validateMatchGoalsVsScore,
  validateMatchCards,
  validateGoalAddition,
  validateCardAddition,
} from '../utils/matchEventsValidation'
import { LeagueFixtureMatchRow, LeaguePlayoffFixtureRow } from '../components/league/LeagueFixtureMatchRows'
import '../styles/League.css'
import { reglamentoPublicHref } from '../utils/reglamentoUrl'

const REGLAMENTO_MAX_BYTES = 5 * 1024 * 1024

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
  const [showEditMatchdayModal, setShowEditMatchdayModal] = useState(false)
  const [editMatchdayForm, setEditMatchdayForm] = useState({ id: '', number: 1 })
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [editingMatchdayId, setEditingMatchdayId] = useState(null)
  const [editingMatchRow, setEditingMatchRow] = useState(null)
  const [matchdayMatches, setMatchdayMatches] = useState({})
  const [teamForm, setTeamForm] = useState({ name: '', shield_url: '', zone_id: '' })
  const [matchdayNumber, setMatchdayNumber] = useState(1)
  const [matchForm, setMatchForm] = useState({ zone_id: '', home_team_id: '', away_team_id: '', played_at: '' })
  const [editingMatchId, setEditingMatchId] = useState(null)
  const [matchScoreForm, setMatchScoreForm] = useState({ home_score: '', away_score: '', home_games: '', away_games: '' })
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({ points_win: 3, points_draw: 1, points_loss: 0, round_trip: false, fase_final_activa: false, odd_team_to: 'upper' })
  const [configSaving, setConfigSaving] = useState(false)
  const [fixtureGenerating, setFixtureGenerating] = useState(false)
  const [zones, setZones] = useState([])
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [zoneForm, setZoneForm] = useState({ name: '', sort_order: 0 })
  const [scorers, setScorers] = useState([])
  const [discipline, setDiscipline] = useState([])
  const [suspensions, setSuspensions] = useState([])
  const [disciplineHistory, setDisciplineHistory] = useState([])
  const [showGoalsCardsModal, setShowGoalsCardsModal] = useState(false)
  const [editingMatchForGoals, setEditingMatchForGoals] = useState(null)
  const [matchGoals, setMatchGoals] = useState([])
  const [matchCards, setMatchCards] = useState([])
  const [goalForm, setGoalForm] = useState({ player_name: '', team_id: '', goals: '1' })
  const [cardForm, setCardForm] = useState({ player_name: '', team_id: '', card_type: 'yellow', suspension_dates: 1 })
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
  const [phaseFinalGenerating, setPhaseFinalGenerating] = useState(false)
  const [phaseFinalStandings, setPhaseFinalStandings] = useState({ upper: [], lower: [] })
  const [playoffBracket, setPlayoffBracket] = useState([])
  const [editingPlayoffMatchId, setEditingPlayoffMatchId] = useState(null)
  const [activeTab, setActiveTab] = useState('teams')
  const [matchScoreInlineError, setMatchScoreInlineError] = useState(null)
  const [goalsCardsActionError, setGoalsCardsActionError] = useState(null)
  const [reglamentoFile, setReglamentoFile] = useState(null)
  const [reglamentoInputKey, setReglamentoInputKey] = useState(0)
  const [reglamentoSaving, setReglamentoSaving] = useState(false)

  const setEditingMatchIdSafe = (id) => {
    setMatchScoreInlineError(null)
    setEditingMatchId(id)
  }

  const handleReglamentoLeagueChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) {
      setReglamentoFile(null)
      return
    }
    if (f.size > REGLAMENTO_MAX_BYTES) {
      setError('El PDF no puede superar 5 MB')
      e.target.value = ''
      setReglamentoFile(null)
      return
    }
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Solo se permiten archivos PDF')
      e.target.value = ''
      setReglamentoFile(null)
      return
    }
    setReglamentoFile(f)
    setError(null)
  }

  const handleSaveReglamentoLeague = async () => {
    if (!reglamentoFile) return
    setReglamentoSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('reglamento', reglamentoFile, reglamentoFile.name)
      const updated = await tournamentApi.updateTournament(tournamentId, fd)
      setTournament(updated)
      setReglamentoFile(null)
      setReglamentoInputKey((k) => k + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setReglamentoSaving(false)
    }
  }

  const handleRemoveReglamentoLeague = async () => {
    if (!window.confirm('¿Quitar el reglamento publicado?')) return
    setReglamentoSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('clear_reglamento', '1')
      const updated = await tournamentApi.updateTournament(tournamentId, fd)
      setTournament(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setReglamentoSaving(false)
    }
  }

  const findMatchById = (matchId) => {
    for (const md of matchdays) {
      const list = matchdayMatches[md.id] || []
      const found = list.find((x) => x.id === matchId)
      if (found) return found
    }
    return null
  }

  const liveMatchEventsValidation = useMemo(() => {
    if (!showGoalsCardsModal || !editingMatchForGoals) {
      return { ok: true, message: null, affectedFields: [] }
    }
    const m = editingMatchForGoals
    const validateGoals =
      m.status === 'played' && m.home_score != null && m.away_score != null
    if (validateGoals) {
      const g = validateMatchGoalsVsScore({
        homeScore: m.home_score,
        awayScore: m.away_score,
        homeTeamId: m.home_team_id,
        awayTeamId: m.away_team_id,
        goals: matchGoals,
      })
      if (!g.ok) {
        return {
          ok: false,
          message: g.message,
          affectedFields: g.affectedFields || ['goals'],
        }
      }
    }
    const c = validateMatchCards({
      cards: matchCards,
      playersByTeam,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
    })
    if (!c.ok) {
      return {
        ok: false,
        message: c.message,
        affectedFields: c.affectedFields || ['cards'],
      }
    }
    return { ok: true, message: null, affectedFields: [] }
  }, [showGoalsCardsModal, editingMatchForGoals, matchGoals, matchCards, playersByTeam])

  /** Plantel por equipo: las claves del API pueden no coincidir en tipo con el <select>. */
  const rosterForTeam = (teamId) => {
    if (teamId == null || teamId === '') return []
    return playersByTeam?.[String(teamId)] ?? playersByTeam?.[teamId] ?? []
  }

  const matchGoalsBySide = useMemo(() => {
    if (!editingMatchForGoals) return { home: [], away: [] }
    const hid = String(editingMatchForGoals.home_team_id ?? '')
    const aid = String(editingMatchForGoals.away_team_id ?? '')
    const home = []
    const away = []
    for (const g of matchGoals || []) {
      const tid = String(g.team_id ?? '')
      if (tid === hid) home.push(g)
      else if (tid === aid) away.push(g)
      else home.push(g)
    }
    return { home, away }
  }, [matchGoals, editingMatchForGoals])

  const loadTournament = () => {
    if (!tournamentId) return
    tournamentApi.getTournament(tournamentId).then(setTournament).catch(() => setTournament(null))
  }

  const loadAll = () => {
    if (!tournamentId) return
    setLoading(true)
    setError(null)
    // Primero obtener torneo y verificar que sea de liga antes de llamar APIs de liga
    tournamentApi.getTournament(tournamentId)
      .then((t) => {
        setTournament(t)
        if (!isLeagueFormat(t)) {
          setError('Este torneo no usa formato de liga.')
          setLoading(false)
          return
        }
        return Promise.all([
          api.getTeams(tournamentId),
          api.getMatchdays(tournamentId),
          api.getConfig(tournamentId),
          api.getZones(tournamentId),
          api.getScorers(tournamentId),
          api.getDiscipline(tournamentId),
          api.getPlayoffBracket(tournamentId).catch(() => []),
          api.getSuspensions(tournamentId).catch(() => []),
          api.getDisciplineHistory(tournamentId).catch(() => []),
        ])
      .then((data) => {
        if (!data) return
        const [te, mds, cfg, z, sc, disc, playoff, susp, discHist] = data
        setTeams(te || [])
        setMatchdays(mds || [])
        setConfig(cfg || { points_win: 3, points_draw: 1, points_loss: 0, round_trip: false, fase_final_activa: false, odd_team_to: 'upper' })
        setZones(z || [])
        setScorers(sc || [])
        setDiscipline(disc || [])
        setPlayoffBracket(Array.isArray(playoff) ? playoff : [])
        setSuspensions(Array.isArray(susp) ? susp : [])
        setDisciplineHistory(Array.isArray(discHist) ? discHist : [])
        setError(null)
        if (cfg?.phase === 'final_mini_ligas') {
          Promise.all([
            api.getStandings(tournamentId, { phase_final_group: 'upper' }),
            api.getStandings(tournamentId, { phase_final_group: 'lower' }),
          ]).then(([upper, lower]) => {
            setPhaseFinalStandings({ upper: upper || [], lower: lower || [] })
          }).catch(() => {})
        } else {
          setPhaseFinalStandings({ upper: [], lower: [] })
        }
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

  const [suspendedPlayersSet, setSuspendedPlayersSet] = useState(new Set())

  const openGoalsCardsModal = (match) => {
    setEditingMatchForGoals(match)
    setGoalsCardsActionError(null)
    setGoalForm({ player_name: '', team_id: match?.home_team_id || '', goals: '1' })
    setCardForm({ player_name: '', team_id: match?.home_team_id || '', card_type: 'yellow', suspension_dates: 1 })
    if (!match?.id) return
    const teamIds = match?.home_team_id && match?.away_team_id
      ? [match.home_team_id, match.away_team_id]
      : []
    Promise.all([
      api.getGoals(tournamentId, match.id),
      api.getCards(tournamentId, match.id),
      teamIds.length ? api.getPlayersByTeams(tournamentId, teamIds) : Promise.resolve({}),
      teamIds.length ? api.getSuspendedPlayers(tournamentId, teamIds) : Promise.resolve({ suspended: [] }),
    ]).then(([goals, cards, byTeam, { suspended }]) => {
      setMatchGoals(goals || [])
      setMatchCards(cards || [])
      setPlayersByTeam(byTeam || {})
      setSuspendedPlayersSet(new Set(suspended || []))
    }).catch(() => {})
    setShowGoalsCardsModal(true)
  }

  const handleAddGoal = async (e) => {
    e.preventDefault()
    if (!editingMatchForGoals?.id || !goalForm.player_name || !goalForm.team_id) return
    const shouldValidateGoals =
      editingMatchForGoals.status === 'played' &&
      editingMatchForGoals.home_score != null &&
      editingMatchForGoals.away_score != null
    if (shouldValidateGoals) {
      const r = validateGoalAddition({
        homeScore: editingMatchForGoals.home_score,
        awayScore: editingMatchForGoals.away_score,
        currentGoals: matchGoals,
        additionalGoals: goalForm.goals,
        homeTeamId: editingMatchForGoals.home_team_id,
        awayTeamId: editingMatchForGoals.away_team_id,
        goalTeamId: goalForm.team_id,
      })
      if (!r.ok) {
        setGoalsCardsActionError(r.message)
        return
      }
    }
    setGoalsCardsActionError(null)
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
      setGoalsCardsActionError(null)
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
      setGoalsCardsActionError(null)
      loadAll()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddCard = async (e) => {
    e.preventDefault()
    if (!editingMatchForGoals?.id || !cardForm.player_name || !cardForm.team_id) return
    const cr = validateCardAddition({
      cards: matchCards,
      playersByTeam,
      homeTeamId: editingMatchForGoals.home_team_id,
      awayTeamId: editingMatchForGoals.away_team_id,
      newCard: {
        player_name: cardForm.player_name.trim(),
        team_id: cardForm.team_id,
        card_type: cardForm.card_type,
      },
    })
    if (!cr.ok) {
      setGoalsCardsActionError(cr.message)
      return
    }
    setGoalsCardsActionError(null)
    setSaving(true)
    try {
      await api.addCard(tournamentId, editingMatchForGoals.id, {
        player_name: cardForm.player_name.trim(),
        team_id: cardForm.team_id,
        card_type: cardForm.card_type,
        suspension_dates: cardForm.card_type === 'red' ? (cardForm.suspension_dates ?? 1) : undefined,
      })
      const [cards, { suspended }] = await Promise.all([
        api.getCards(tournamentId, editingMatchForGoals.id),
        api.getSuspendedPlayers(tournamentId, [editingMatchForGoals.home_team_id, editingMatchForGoals.away_team_id]),
      ])
      setMatchCards(cards || [])
      setSuspendedPlayersSet(new Set(suspended || []))
      setCardForm({ player_name: '', team_id: cardForm.team_id, card_type: 'yellow', suspension_dates: 1 })
      setGoalsCardsActionError(null)
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
      setGoalsCardsActionError(null)
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
      if (config?.phase === 'final_mini_ligas') {
        const [upper, lower] = await Promise.all([
          api.getStandings(tournamentId, { phase_final_group: 'upper' }),
          api.getStandings(tournamentId, { phase_final_group: 'lower' }),
        ])
        setPhaseFinalStandings({ upper: upper || [], lower: lower || [] })
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleGeneratePhaseFinal = async () => {
    if (!config.fase_final_activa) {
      setError('Activá la fase final en Configuración antes de generarla.')
      return
    }
    if (!window.confirm('¿Generar fase final? Se dividirá la tabla en dos grupos (mitad superior e inferior) y cada uno jugará una mini-liga todos contra todos.')) return
    setPhaseFinalGenerating(true)
    setError(null)
    try {
      await api.generatePhaseFinal(tournamentId)
      loadAll()
      setActiveTab('phasefinal')
      alert('Fase final generada. Grupo A: mitad superior, Grupo B: mitad inferior.')
    } catch (err) {
      setError(err.message)
    } finally {
      setPhaseFinalGenerating(false)
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

  const handleSaveMatch = async (e) => {
    e.preventDefault()
    if (!editingMatchdayId || !matchForm.home_team_id || !matchForm.away_team_id) return
    setSaving(true)
    setError(null)
    const mdId = editingMatchdayId
    try {
      if (editingMatchRow?.id) {
        await api.updateMatch(tournamentId, editingMatchRow.id, {
          home_team_id: matchForm.home_team_id,
          away_team_id: matchForm.away_team_id,
          played_at: matchForm.played_at || null,
        })
      } else {
        await api.createMatch(tournamentId, mdId, {
          home_team_id: matchForm.home_team_id,
          away_team_id: matchForm.away_team_id,
          played_at: matchForm.played_at || null,
        })
      }
      setShowMatchModal(false)
      setEditingMatchdayId(null)
      setEditingMatchRow(null)
      setMatchForm({ zone_id: '', home_team_id: '', away_team_id: '', played_at: '' })
      loadMatchdayMatches(mdId)
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const openMatchModal = (matchdayId) => {
    setEditingMatchdayId(matchdayId)
    setEditingMatchRow(null)
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

  const openEditMatchModal = (matchdayId, m) => {
    setEditingMatchdayId(matchdayId)
    setEditingMatchRow(m)
    const zFromMatch = m.zone_id || ''
    setMatchForm({
      zone_id: zFromMatch || (zones.length > 0 ? zones[0]?.id : ''),
      home_team_id: m.home_team_id,
      away_team_id: m.away_team_id,
      played_at: playedAtToDatetimeLocal(m.played_at),
    })
    setShowMatchModal(true)
  }

  const handleSaveEditMatchday = async (e) => {
    e.preventDefault()
    if (!editMatchdayForm.id) return
    setSaving(true)
    setError(null)
    try {
      await api.updateMatchday(tournamentId, editMatchdayForm.id, { number: editMatchdayForm.number })
      setShowEditMatchdayModal(false)
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMatchday = async (md) => {
    if (!window.confirm(`¿Eliminar la jornada ${md.number} y todos sus partidos? Esta acción no se puede deshacer.`)) return
    setSaving(true)
    setError(null)
    try {
      await api.deleteMatchday(tournamentId, md.id)
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMatch = async (matchId, matchdayId) => {
    if (!window.confirm('¿Eliminar este partido? También se borran goles y tarjetas cargados en ese partido.')) return
    setSaving(true)
    setError(null)
    try {
      await api.deleteMatch(tournamentId, matchId)
      loadMatchdayMatches(matchdayId)
      loadAll()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateMatchScore = async (matchId, home_score, away_score, home_games, away_games) => {
    try {
      if (tournament?.sport !== 'padel') {
        const goals = await api.getGoals(tournamentId, matchId)
        const m = findMatchById(matchId)
        if (m) {
          const r = validateMatchGoalsVsScore({
            homeScore: home_score,
            awayScore: away_score,
            homeTeamId: m.home_team_id,
            awayTeamId: m.away_team_id,
            goals,
          })
          if (!r.ok) {
            setMatchScoreInlineError({ matchId, message: r.message })
            return
          }
        }
      }
      setMatchScoreInlineError(null)
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

  if (!tournament) {
    return (
      <Container className="py-5">
        <Alert variant="warning">Torneo no encontrado.</Alert>
        <Link to="/admin">Volver al panel</Link>
      </Container>
    )
  }

  const isPadel = tournament.sport === 'padel'
  const isHockey = tournament.sport === 'hockey'
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
          <Navbar.Toggle aria-controls="league-admin-nav" />
          <Navbar.Collapse id="league-admin-nav">
            <Nav className="ms-auto">
              <Nav.Link as={Link} to={`/torneo/${tournamentId}`}>Ver público</Nav.Link>
              <Nav.Link as={Link} to="/admin">Panel</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="py-3 py-md-4 px-3 px-md-0">
        <div className="league-header">
          <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-start justify-content-between gap-2 gap-sm-3">
            <div className="min-w-0 flex-grow-1">
              <h1>{tournament.name}</h1>
              <p className="subtitle mb-0">{adminLabel} · {teamsLabel}, {rosterLabel.toLowerCase()}, fixture y resultados</p>
            </div>
            {tournament.reglamento_url && (
              <Button
                as="a"
                variant="outline-primary"
                size="sm"
                className="flex-shrink-0 align-self-start league-header-reglamento-btn"
                href={reglamentoPublicHref(tournament.reglamento_url)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Reglamento
              </Button>
            )}
          </div>
        </div>

        <Card className="mb-3 shadow-sm">
          <Card.Header className="py-2 small fw-semibold">Reglamento publicado (PDF)</Card.Header>
          <Card.Body className="py-3">
            {tournament.reglamento_url && (
              <p className="small text-muted mb-2 mb-md-3">
                Podés <a href={reglamentoPublicHref(tournament.reglamento_url)} target="_blank" rel="noopener noreferrer">ver el PDF actual</a> en una pestaña nueva.
              </p>
            )}
            <div className="d-flex flex-column flex-md-row flex-wrap align-items-stretch align-items-md-end gap-2">
              <Form.Group className="mb-0 flex-grow-1" style={{ minWidth: 0, maxWidth: 'min(100%, 320px)' }}>
                <Form.Label className="small text-muted mb-1">Reemplazar o agregar PDF (máx. 5 MB)</Form.Label>
                <Form.Control
                  key={reglamentoInputKey}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleReglamentoLeagueChange}
                  disabled={reglamentoSaving}
                />
              </Form.Group>
              <div className="d-flex flex-wrap gap-2 pb-md-1">
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={handleSaveReglamentoLeague}
                  disabled={reglamentoSaving || !reglamentoFile}
                >
                  {reglamentoSaving ? <Spinner animation="border" size="sm" /> : 'Guardar PDF'}
                </Button>
                {tournament.reglamento_url && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    type="button"
                    onClick={handleRemoveReglamentoLeague}
                    disabled={reglamentoSaving}
                  >
                    Quitar reglamento
                  </Button>
                )}
              </div>
            </div>
            {reglamentoFile && (
              <Form.Text className="text-muted d-block mt-2">{reglamentoFile.name}</Form.Text>
            )}
          </Card.Body>
        </Card>

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
              {isLigaFormat && (config.fase_final_activa || config.phase === 'final_mini_ligas') && (
                <>
                  <span className="league-step">→</span>
                  <span className="league-step">
                    <span className="league-step-num">6</span> Fase final
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
                    {isLigaFormat && (
                      <>
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="checkbox"
                            id="fase_final_activa"
                            label="Fase final activa (mitad superior e inferior juegan mini-ligas)"
                            checked={!!config.fase_final_activa}
                            onChange={(e) => setConfig((c) => ({ ...c, fase_final_activa: e.target.checked }))}
                          />
                          <Form.Text className="text-muted">
                            Al finalizar la fase regular, se genera una segunda fase con Grupo A (mitad superior) y Grupo B (mitad inferior).
                          </Form.Text>
                        </Form.Group>
                        {config.fase_final_activa && (
                          <Form.Group className="mb-3">
                            <Form.Label>Si hay cantidad impar de equipos, el del medio va a</Form.Label>
                            <Form.Select
                              value={config.odd_team_to || 'upper'}
                              onChange={(e) => setConfig((c) => ({ ...c, odd_team_to: e.target.value }))}
                              style={{ maxWidth: 200 }}
                            >
                              <option value="upper">Grupo A (mitad superior)</option>
                              <option value="lower">Grupo B (mitad inferior)</option>
                            </Form.Select>
                          </Form.Group>
                        )}
                      </>
                    )}
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
                    {isLigaFormat && config.fase_final_activa && config.phase !== 'final_mini_ligas' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={handleGeneratePhaseFinal}
                        disabled={phaseFinalGenerating}
                        title="Genera fase final: mitad superior e inferior en mini-ligas"
                      >
                        {phaseFinalGenerating ? 'Generando…' : 'Generar fase final'}
                      </Button>
                    )}
                  </div>
                </Card.Header>
                <Card.Body>
                  {matchdays.map((md) => (
                    <Card key={md.id} className="mb-3">
                      <Card.Header className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <span>Jornada {md.number}</span>
                        <div className="d-flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={saving}
                            onClick={() => {
                              setEditMatchdayForm({ id: md.id, number: md.number })
                              setShowEditMatchdayModal(true)
                            }}
                          >
                            Editar jornada
                          </Button>
                          <Button size="sm" variant="outline-danger" disabled={saving} onClick={() => handleDeleteMatchday(md)}>
                            Eliminar jornada
                          </Button>
                          <Button size="sm" variant="outline-primary" onClick={() => openMatchModal(md.id)}>
                            Agregar partido
                          </Button>
                        </div>
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
                            <div
                              key={zone?.id || '_all'}
                              className={zone ? 'league-match-group mb-3' : 'league-match-group league-match-group--bare mb-0'}
                            >
                              {zone && (
                                <div className="league-match-group__header">
                                  <h3 className="league-match-group__title">{zone.name}</h3>
                                </div>
                              )}
                              <div className="league-match-group__body">
                                <div className="league-match-head d-none d-md-grid">
                                  <span className="league-match-head__cell league-match-head__cell--home">Local</span>
                                  <span className="league-match-head__cell league-match-head__cell--score">Resultado</span>
                                  <span className="league-match-head__cell league-match-head__cell--away">Visitante</span>
                                  <span className="league-match-head__cell league-match-head__cell--date">Fecha</span>
                                  <span className="league-match-head__cell league-match-head__cell--actions">Acciones</span>
                                </div>
                                <div className="league-match-list">
                                  {zoneMatches.map((m) => (
                                    <LeagueFixtureMatchRow
                                      key={m.id}
                                      match={m}
                                      homeLabel={m.home_team_name}
                                      awayLabel={m.away_team_name}
                                      isPadel={isPadel}
                                      editingMatchId={editingMatchId}
                                      matchScoreForm={matchScoreForm}
                                      setMatchScoreForm={setMatchScoreForm}
                                      setEditingMatchId={setEditingMatchIdSafe}
                                      onSaveScore={handleUpdateMatchScore}
                                      onOpenGoalsCards={openGoalsCardsModal}
                                      onOpenEditMatch={openEditMatchModal}
                                      onDeleteMatch={handleDeleteMatch}
                                      matchdayId={md.id}
                                      saving={saving}
                                      scoreInlineError={matchScoreInlineError?.matchId === m.id ? matchScoreInlineError.message : null}
                                    />
                                  ))}
                                </div>
                              </div>
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
                        <tr>
                          <th>Jugador</th><th>Equipo</th>
                          {isHockey && <th>🟩 Verdes</th>}
                          <th>🟨 Amarillas</th><th>🟥 Rojas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {discipline.map((row, i) => (
                          <tr key={i}>
                            <td>{row.player_name}</td>
                            <td>{row.team_name}</td>
                            {isHockey && <td>{row.green ?? 0}</td>}
                            <td>{row.yellow}</td>
                            <td>{row.red}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
              <Card className="mt-3">
                <Card.Header className="fw-bold">Suspensiones</Card.Header>
                <Card.Body className="p-0">
                  {suspensions.length === 0 ? (
                    <div className="league-empty py-3"><div className="league-empty-icon">🚫</div><p className="mb-0 small">
                      Sin suspensiones. {isHockey ? 'En hockey: 3 verdes o 2 amarillas = 1 fecha automática. Roja directa: 1-3 fechas manuales.' : 'En fútbol: 3 amarillas = 1 fecha automática. Roja directa: 1-3 fechas manuales.'}
                    </p></div>
                  ) : (
                    <Table responsive hover className="mb-0">
                      <thead className="table-light">
                        <tr><th>Jugador</th><th>Equipo</th><th>Motivo</th><th>Fechas</th><th>Estado</th></tr>
                      </thead>
                      <tbody>
                        {suspensions.map((s) => (
                          <tr key={s.id}>
                            <td>{s.player_name}</td>
                            <td>{s.team_name}</td>
                            <td>{s.reason_label}</td>
                            <td>{s.dates_served}/{s.dates_total}</td>
                            <td>{s.is_active ? <span className="badge bg-warning text-dark">Suspendido</span> : <span className="badge bg-secondary">Cumplida</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </Card.Body>
              </Card>
              <Card className="mt-3">
                <Card.Header className="fw-bold">Historial disciplinario</Card.Header>
                <Card.Body className="p-0">
                  {disciplineHistory.length === 0 ? (
                    <div className="league-empty py-3"><p className="mb-0 small">Sin historial de tarjetas o suspensiones.</p></div>
                  ) : (
                    <div className="p-2">
                      {disciplineHistory.map((player, i) => (
                        <div key={i} className="mb-3 p-2 border rounded">
                          <strong>{player.player_name}</strong> — {player.team_name}
                          <div className="mt-1 small">
                            {player.cards?.length > 0 && (
                              <span className="me-2">{player.cards.map((c) => (c.card_type === 'green' ? '🟩' : c.card_type === 'yellow' ? '🟨' : '🟥') + ' ' + c.card_label).join(', ')}</span>
                            )}
                            {player.suspensions?.length > 0 && (
                              <span className="text-muted">Suspensiones: {player.suspensions.map((s) => `${s.reason_label} (${s.dates_served}/${s.dates_total})`).join('; ')}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Tab>
            )}
            {isLigaFormat && (config.fase_final_activa || config.phase === 'final_mini_ligas') && (
            <Tab eventKey="phasefinal" title="Fase final">
              {config.phase !== 'final_mini_ligas' ? (
                <Card>
                  <Card.Body className="py-5 text-center text-muted">
                    <p className="mb-2">La fase final aún no fue generada.</p>
                    <p className="mb-0 small">Completá las jornadas de la fase regular y usá el botón «Generar fase final» en la pestaña Jornadas.</p>
                  </Card.Body>
                </Card>
              ) : (
                <>
                  {['upper', 'lower'].map((groupType) => {
                    const groupLabel = groupType === 'upper' ? 'Grupo A (mitad superior)' : 'Grupo B (mitad inferior)'
                    const groupRounds = playoffBracket.filter((r) => r.phase_final_group === groupType)
                    const groupStandings = groupType === 'upper' ? phaseFinalStandings.upper : phaseFinalStandings.lower
                    return (
                      <Card key={groupType} className="mb-4">
                        <Card.Header className="fw-bold">{groupLabel}</Card.Header>
                        <Card.Body>
                          <h6 className="league-section-title">Tabla</h6>
                          {groupStandings.length === 0 ? (
                            <p className="text-muted small">Sin partidos jugados aún.</p>
                          ) : (
                            <Table responsive size="sm" className="mb-4">
                              <thead className="table-light">
                                <tr><th>#</th><th>{teamLabel}</th><th>PJ</th><th>PG</th>{!isPadel && <th>PE</th>}<th>PP</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr>
                              </thead>
                              <tbody>
                                {groupStandings.map((row) => (
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
                                    <td className="fw-semibold">{row.points}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          )}
                          <h6 className="league-section-title">Partidos</h6>
                          {groupRounds.map((round) => (
                            <div key={round.id} className="mb-3">
                              <div className="league-match-round-label">{round.name}</div>
                              <div className="league-match-group mb-0">
                              <div className="league-match-group__body">
                                <div className="league-match-head league-match-head--playoff d-none d-md-grid">
                                  <span className="league-match-head__cell league-match-head__cell--home">Local</span>
                                  <span className="league-match-head__cell league-match-head__cell--score">Resultado</span>
                                  <span className="league-match-head__cell league-match-head__cell--away">Visitante</span>
                                </div>
                                <div className="league-match-list">
                                  {(round.matches || []).map((m) => (
                                    <LeaguePlayoffFixtureRow
                                      key={m.id}
                                      match={m}
                                      homeLabel={m.home_team_name || 'Sin definir'}
                                      awayLabel={m.away_team_name || 'Sin definir'}
                                      editingPlayoffMatchId={editingPlayoffMatchId}
                                      matchScoreForm={matchScoreForm}
                                      setMatchScoreForm={setMatchScoreForm}
                                      setEditingPlayoffMatchId={setEditingPlayoffMatchId}
                                      onSavePlayoffScore={handleUpdatePlayoffScore}
                                    />
                                  ))}
                                </div>
                              </div>
                              </div>
                            </div>
                          ))}
                        </Card.Body>
                      </Card>
                    )
                  })}
                </>
              )}
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
                      <div className="league-match-group league-match-group--bare">
                        <div className="league-match-group__body">
                          <div className="league-match-head league-match-head--playoff d-none d-md-grid">
                            <span className="league-match-head__cell league-match-head__cell--home">Local</span>
                            <span className="league-match-head__cell league-match-head__cell--score">Resultado</span>
                            <span className="league-match-head__cell league-match-head__cell--away">Visitante</span>
                          </div>
                          <div className="league-match-list">
                            {(round.matches || []).map((m) => (
                              <LeaguePlayoffFixtureRow
                                key={m.id}
                                match={m}
                                homeLabel={m.home_team_name || m.home_slot || 'Sin definir'}
                                awayLabel={m.away_team_name || m.away_slot || 'Sin definir'}
                                editingPlayoffMatchId={editingPlayoffMatchId}
                                matchScoreForm={matchScoreForm}
                                setMatchScoreForm={setMatchScoreForm}
                                setEditingPlayoffMatchId={setEditingPlayoffMatchId}
                                onSavePlayoffScore={handleUpdatePlayoffScore}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
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

        <Modal show={showGoalsCardsModal} onHide={() => { if (!saving) { setShowGoalsCardsModal(false); setEditingMatchForGoals(null); setGoalsCardsActionError(null); } }} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              Goles y tarjetas — {editingMatchForGoals?.home_team_name} vs {editingMatchForGoals?.away_team_name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {(goalsCardsActionError || (!liveMatchEventsValidation.ok && liveMatchEventsValidation.message)) && (
              <Alert variant="danger" className="league-match-events-validation-alert">
                {goalsCardsActionError || liveMatchEventsValidation.message}
              </Alert>
            )}
            <div
              className={
                !liveMatchEventsValidation.ok && liveMatchEventsValidation.affectedFields?.includes('goals')
                  ? 'league-match-events-section league-match-events-section--conflict'
                  : 'league-match-events-section'
              }
            >
            <h6 className="mt-2">Goles</h6>
            <p className="text-muted small mb-2 mb-md-3">
              Podés cargar tantas filas como necesites (un jugador puede tener más de una fila o varios goles en una sola).
              Si el partido ya tiene resultado cargado, la suma de goles debe coincidir con el marcador.
            </p>
            <Row className="g-3 mb-3">
              <Col md={6}>
                <div className="league-goals-team-block">
                  <div className="league-goals-team-block__title">
                    Local — <span className="text-body">{editingMatchForGoals?.home_team_name}</span>
                  </div>
                  <Table size="sm" responsive className="mb-0 league-goals-team-block__table">
                    <thead><tr><th>Jugador</th><th>Goles</th><th></th></tr></thead>
                    <tbody>
                      {matchGoalsBySide.home.map((g) => (
                        <tr key={g.id}>
                          <td>{g.player_name}</td>
                          <td>{g.goals ?? 1}</td>
                          <td>
                            <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDeleteGoal(g.id)}>Eliminar</Button>
                          </td>
                        </tr>
                      ))}
                      {matchGoalsBySide.home.length === 0 && (
                        <tr><td colSpan={3} className="text-muted small">Sin goles del local</td></tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Col>
              <Col md={6}>
                <div className="league-goals-team-block">
                  <div className="league-goals-team-block__title">
                    Visitante — <span className="text-body">{editingMatchForGoals?.away_team_name}</span>
                  </div>
                  <Table size="sm" responsive className="mb-0 league-goals-team-block__table">
                    <thead><tr><th>Jugador</th><th>Goles</th><th></th></tr></thead>
                    <tbody>
                      {matchGoalsBySide.away.map((g) => (
                        <tr key={g.id}>
                          <td>{g.player_name}</td>
                          <td>{g.goals ?? 1}</td>
                          <td>
                            <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDeleteGoal(g.id)}>Eliminar</Button>
                          </td>
                        </tr>
                      ))}
                      {matchGoalsBySide.away.length === 0 && (
                        <tr><td colSpan={3} className="text-muted small">Sin goles del visitante</td></tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Col>
            </Row>
            <Form onSubmit={handleAddGoal} className="d-flex flex-wrap gap-2 align-items-end mb-4">
              <Form.Select
                aria-label="Equipo del gol"
                value={goalForm.team_id}
                onChange={(e) => setGoalForm((f) => ({ ...f, team_id: e.target.value, player_name: '' }))}
                style={{ width: 220 }}
              >
                <option value="">Equipo</option>
                {editingMatchForGoals && [
                  { id: editingMatchForGoals.home_team_id, name: editingMatchForGoals.home_team_name, side: 'Local' },
                  { id: editingMatchForGoals.away_team_id, name: editingMatchForGoals.away_team_name, side: 'Visitante' },
                ].map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.side}: {t.name}
                  </option>
                ))}
              </Form.Select>
              {goalForm.team_id && (
                rosterForTeam(goalForm.team_id).length > 0 ? (
                  <Form.Select
                    aria-label="Jugador"
                    value={goalForm.player_name}
                    onChange={(e) => setGoalForm((f) => ({ ...f, player_name: e.target.value }))}
                    style={{ width: 220 }}
                    required
                  >
                    <option value="">Seleccionar jugador</option>
                    {rosterForTeam(goalForm.team_id).map((p) => {
                      const key = `${p.player_name}::${goalForm.team_id}`
                      const suspended = suspendedPlayersSet.has(key)
                      return (
                        <option key={p.id} value={p.player_name} disabled={suspended}>
                          {p.shirt_number ? `${p.shirt_number}. ` : ''}{p.player_name}{suspended ? ' (Suspendido)' : ''}
                        </option>
                      )
                    })}
                  </Form.Select>
                ) : (
                  <Form.Control
                    aria-label="Nombre del jugador"
                    placeholder="Jugador (cargar plantel en Equipos)"
                    value={goalForm.player_name}
                    onChange={(e) => setGoalForm((f) => ({ ...f, player_name: e.target.value }))}
                    style={{ width: 220 }}
                  />
                )
              )}
              <Form.Control
                type="number"
                min={1}
                max={999}
                step={1}
                placeholder="Goles"
                value={goalForm.goals}
                onChange={(e) => setGoalForm((f) => ({ ...f, goals: e.target.value }))}
                style={{ width: 80 }}
                title="Cantidad de goles en esta fila"
              />
              <Button type="submit" size="sm" disabled={saving || !goalForm.player_name?.trim() || !goalForm.team_id}>Agregar gol</Button>
            </Form>
            </div>

            <div
              className={
                !liveMatchEventsValidation.ok && liveMatchEventsValidation.affectedFields?.includes('cards')
                  ? 'league-match-events-section league-match-events-section--conflict'
                  : 'league-match-events-section'
              }
            >
            <h6>Tarjetas</h6>
            <Table size="sm" className="mb-3">
              <thead><tr><th>Jugador</th><th>Equipo</th><th>Tipo</th><th></th></tr></thead>
              <tbody>
                {matchCards.map((c) => (
                  <tr key={c.id}>
                    <td>{c.player_name}</td>
                    <td>{c.team_name}</td>
                    <td>{c.card_type === 'green' ? '🟩 Verde' : c.card_type === 'yellow' ? '🟨 Amarilla' : '🟥 Roja'}</td>
                    <td>
                      <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDeleteCard(c.id)}>Eliminar</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Form onSubmit={handleAddCard} className="d-flex flex-wrap gap-2 align-items-end">
              <Form.Select
                aria-label="Equipo de la tarjeta"
                value={cardForm.team_id}
                onChange={(e) => setCardForm((f) => ({ ...f, team_id: e.target.value, player_name: '' }))}
                style={{ width: 220 }}
              >
                <option value="">Equipo</option>
                {editingMatchForGoals && [
                  { id: editingMatchForGoals.home_team_id, name: editingMatchForGoals.home_team_name, side: 'Local' },
                  { id: editingMatchForGoals.away_team_id, name: editingMatchForGoals.away_team_name, side: 'Visitante' },
                ].map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.side}: {t.name}
                  </option>
                ))}
              </Form.Select>
              {cardForm.team_id && (
                rosterForTeam(cardForm.team_id).length > 0 ? (
                  <Form.Select
                    aria-label="Jugador"
                    value={cardForm.player_name}
                    onChange={(e) => setCardForm((f) => ({ ...f, player_name: e.target.value }))}
                    style={{ width: 220 }}
                    required
                  >
                    <option value="">Seleccionar jugador</option>
                    {rosterForTeam(cardForm.team_id).map((p) => {
                      const key = `${p.player_name}::${cardForm.team_id}`
                      const suspended = suspendedPlayersSet.has(key)
                      return (
                        <option key={p.id} value={p.player_name} disabled={suspended}>
                          {p.shirt_number ? `${p.shirt_number}. ` : ''}{p.player_name}{suspended ? ' (Suspendido)' : ''}
                        </option>
                      )
                    })}
                  </Form.Select>
                ) : (
                  <span className="text-muted small" style={{ alignSelf: 'center' }}>
                    Cargar plantel del equipo primero
                  </span>
                )
              )}
              <Form.Select
                value={cardForm.card_type}
                onChange={(e) => setCardForm((f) => ({ ...f, card_type: e.target.value }))}
                style={{ width: 120 }}
              >
                {isHockey && <option value="green">🟩 Verde</option>}
                <option value="yellow">🟨 Amarilla</option>
                <option value="red">🟥 Roja</option>
              </Form.Select>
              {cardForm.card_type === 'red' && (
                <Form.Select
                  value={cardForm.suspension_dates ?? 1}
                  onChange={(e) => setCardForm((f) => ({ ...f, suspension_dates: Number(e.target.value) }))}
                  style={{ width: 90 }}
                  title="Fechas de suspensión por roja directa"
                >
                  <option value={1}>1 fecha</option>
                  <option value={2}>2 fechas</option>
                  <option value={3}>3 fechas</option>
                </Form.Select>
              )}
              <Button type="submit" size="sm" disabled={saving || !cardForm.player_name?.trim() || !cardForm.team_id}>Agregar tarjeta</Button>
            </Form>
            </div>
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

        <Modal show={showEditMatchdayModal} onHide={() => !saving && setShowEditMatchdayModal(false)}>
          <Modal.Header closeButton><Modal.Title>Editar jornada</Modal.Title></Modal.Header>
          <Form onSubmit={handleSaveEditMatchday}>
            <Modal.Body>
              <Form.Group>
                <Form.Label>Número de jornada</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={editMatchdayForm.number}
                  onChange={(e) => setEditMatchdayForm((f) => ({ ...f, number: Number(e.target.value) || 1 }))}
                />
                <Form.Text className="text-muted">Debe ser único en el torneo (no puede repetirse con otra jornada).</Form.Text>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowEditMatchdayModal(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
            </Modal.Footer>
          </Form>
        </Modal>

        <Modal show={showMatchModal} onHide={() => { if (!saving) { setShowMatchModal(false); setEditingMatchRow(null) } }}>
          <Modal.Header closeButton><Modal.Title>{editingMatchRow ? 'Editar partido' : 'Nuevo partido'}</Modal.Title></Modal.Header>
          <Form onSubmit={handleSaveMatch}>
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
                <Form.Text className="text-muted">Horario en hora Argentina (la que elegís es la que se guarda y muestra).</Form.Text>
              </Form.Group>
              {editingMatchRow && (
                <p className="small text-muted mb-0">
                  Si cambiás local o visitante, se borran goles y tarjetas de este partido y el resultado vuelve a pendiente.
                </p>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => { if (!saving) { setShowMatchModal(false); setEditingMatchRow(null) } }} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving || !matchForm.home_team_id || !matchForm.away_team_id || (zones.length > 0 && !matchForm.zone_id)}>{saving ? 'Guardando…' : editingMatchRow ? 'Guardar' : 'Agregar'}</Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </Container>
    </div>
  )
}
