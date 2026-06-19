import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveCurrentMatchday,
  resolveMatchdayScheduledDate,
  calendarDateFromPlayedAt,
} from './matchdayCalendar.js'

const md = (number, scheduled_date, start_date = '2026-06-01') => ({
  id: `md-${number}`,
  tournament_id: 't-1',
  number,
  scheduled_date,
  start_date,
})

describe('calendarDateFromPlayedAt', () => {
  it('extrae la fecha de un DATETIME MySQL', () => {
    assert.equal(calendarDateFromPlayedAt('2026-06-08 19:00:00'), '2026-06-08')
  })
})

describe('resolveMatchdayScheduledDate', () => {
  it('usa scheduled_date de partidos cuando existe', () => {
    assert.equal(
      resolveMatchdayScheduledDate({ number: 2, scheduled_date: '2026-06-08', start_date: '2026-06-01' }),
      '2026-06-08'
    )
  })

  it('calcula semana desde start_date si no hay partidos fechados', () => {
    assert.equal(
      resolveMatchdayScheduledDate({ number: 3, scheduled_date: null, start_date: '2026-06-01' }),
      '2026-06-15'
    )
  })
})

describe('resolveCurrentMatchday', () => {
  it('fecha sin partidos cargados → avanza según calendario', () => {
    const matchdays = [
      md(1, '2026-06-01'),
      md(2, '2026-06-08'),
      md(3, '2026-06-15'),
    ]
    const result = resolveCurrentMatchday(matchdays, { today: '2026-06-18' })
    assert.equal(result.number, 3)
  })

  it('fecha con partidos suspendidos → avanza según calendario', () => {
    const matchdays = [
      md(1, '2026-06-01'),
      md(2, '2026-06-08'),
      md(3, '2026-06-15'),
    ]
    const result = resolveCurrentMatchday(matchdays, { today: '2026-06-10' })
    assert.equal(result.number, 2)
  })

  it('fecha reprogramada → respeta la nueva fecha', () => {
    const matchdays = [
      md(1, '2026-06-01'),
      md(2, '2026-06-25'),
      md(3, '2026-06-15'),
    ]
    const result = resolveCurrentMatchday(matchdays, { today: '2026-06-10' })
    assert.equal(result.number, 1)
  })

  it('torneo finalizado → muestra la última fecha', () => {
    const matchdays = [
      md(1, '2026-06-01'),
      md(2, '2026-06-08'),
      md(3, '2026-06-15'),
    ]
    const result = resolveCurrentMatchday(matchdays, {
      today: '2026-06-18',
      tournamentStatus: 'finished',
    })
    assert.equal(result.number, 3)
  })

  it('torneo recién creado → primera fecha según calendario futuro', () => {
    const matchdays = [
      md(1, '2026-06-01'),
      md(2, '2026-06-08'),
    ]
    const result = resolveCurrentMatchday(matchdays, { today: '2026-05-20' })
    assert.equal(result.number, 1)
  })

  it('sin fechas en partidos usa start_date del torneo', () => {
    const matchdays = [
      md(1, null),
      md(2, null),
      md(3, null),
    ]
    const result = resolveCurrentMatchday(matchdays, { today: '2026-06-18' })
    assert.equal(result.number, 3)
  })

  it('devuelve null si no hay jornadas', () => {
    assert.equal(resolveCurrentMatchday([]), null)
  })
})
