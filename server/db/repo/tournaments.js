import { pool } from '../index.js'

function generateId() {
  return 't-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9)
}

function rowToTournament(row) {
  if (!row) return null
  const state = row.state_json ? JSON.parse(row.state_json) : null
  return {
    id: row.id,
    name: row.name,
    sport: row.sport,
    modality: row.modality,
    status: row.status,
    start_date: row.start_date,
    end_date: row.end_date,
    rules: row.rules,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    state,
    config: state?.config ?? null,
    currentDate: state?.currentDate ?? null,
    datesCount: state?.dates?.length ?? 0,
  }
}

/** Torneos de pádel con state completo (1 query) para ranking global */
export async function getAllPadelWithState() {
  const [rows] = await pool.query(
    'SELECT id, state_json FROM tournaments WHERE sport = ? ORDER BY created_at DESC',
    ['padel']
  )
  return rows.map((r) => {
    const state = r.state_json ? JSON.parse(r.state_json) : null
    return { id: r.id, state }
  })
}

export async function getAll(filters = {}) {
  let sql = 'SELECT id, name, sport, modality, status, start_date, end_date, rules, created_at, updated_at, state_json FROM tournaments WHERE 1=1'
  const params = []
  if (filters.status) {
    sql += ' AND status = ?'
    params.push(filters.status)
  }
  if (filters.sport) {
    sql += ' AND sport = ?'
    params.push(filters.sport)
  }
  sql += ' ORDER BY created_at DESC'
  const [rows] = await pool.query(sql, params)
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sport: r.sport,
    modality: r.modality,
    status: r.status,
    start_date: r.start_date,
    end_date: r.end_date,
    rules: r.rules,
    createdAt: r.created_at,
    config: r.state_json ? JSON.parse(r.state_json)?.config : null,
    currentDate: r.state_json ? JSON.parse(r.state_json)?.currentDate : null,
    datesCount: r.state_json && Array.isArray(JSON.parse(r.state_json)?.dates) ? JSON.parse(r.state_json).dates.length : 0,
  }))
}

export async function getById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, sport, modality, status, start_date, end_date, rules, created_at, updated_at, state_json FROM tournaments WHERE id = ?',
    [id]
  )
  return rows.length ? rowToTournament(rows[0]) : null
}

export async function create(data) {
  const id = data.id || generateId()
  const name = (data.name && String(data.name).trim()) || `Torneo ${id}`
  const sport = data.sport || 'padel'
  const modality = data.modality || (sport === 'padel' ? 'escalera' : 'liga')
  const status = data.status || 'active'
  const start_date = data.start_date || null
  const end_date = data.end_date || null
  const rules = data.rules != null ? data.rules : ''
  const state_json = data.state_json != null ? data.state_json : null
  const created_at = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await pool.query(
    `INSERT INTO tournaments (id, name, sport, modality, status, start_date, end_date, rules, created_at, state_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, sport, modality, status, start_date, end_date, rules, created_at, state_json]
  )
  return getById(id)
}

export async function update(id, data) {
  const updates = []
  const params = []
  if (data.name !== undefined) {
    updates.push('name = ?')
    params.push(String(data.name).trim())
  }
  if (data.sport !== undefined) {
    updates.push('sport = ?')
    params.push(data.sport)
  }
  if (data.modality !== undefined) {
    updates.push('modality = ?')
    params.push(data.modality)
  }
  if (data.status !== undefined) {
    updates.push('status = ?')
    params.push(data.status)
  }
  if (data.start_date !== undefined) {
    updates.push('start_date = ?')
    params.push(data.start_date || null)
  }
  if (data.end_date !== undefined) {
    updates.push('end_date = ?')
    params.push(data.end_date || null)
  }
  if (data.rules !== undefined) {
    updates.push('rules = ?')
    params.push(data.rules)
  }
  if (data.state_json !== undefined) {
    updates.push('state_json = ?')
    params.push(typeof data.state_json === 'string' ? data.state_json : JSON.stringify(data.state_json))
  }
  if (updates.length === 0) return getById(id)
  params.push(id)
  await pool.query(`UPDATE tournaments SET ${updates.join(', ')} WHERE id = ?`, params)
  return getById(id)
}

export async function remove(id) {
  const [r] = await pool.query('DELETE FROM tournaments WHERE id = ?', [id])
  return r.affectedRows > 0
}

export async function updateState(id, state) {
  const state_json = state == null ? null : (typeof state === 'string' ? state : JSON.stringify(state))
  await pool.query('UPDATE tournaments SET state_json = ? WHERE id = ?', [state_json, id])
  return getById(id)
}
