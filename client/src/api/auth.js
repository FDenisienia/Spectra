const BASE = import.meta.env.VITE_API_URL || '/api'

const AUTH_TOKEN_KEY = 'spectra_admin_token'

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token)
  else localStorage.removeItem(AUTH_TOKEN_KEY)
}

export async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error al iniciar sesión')
  }
  const data = await res.json()
  setStoredToken(data.token)
  return data
}

export async function changePassword(currentPassword, newPassword) {
  const res = await fetch(`${BASE}/auth/change-password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error al cambiar contraseña')
  }
  return res.json()
}

export async function getMe() {
  const token = getStoredToken()
  if (!token) return null
  const res = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data
}

export function logout() {
  setStoredToken(null)
}

export function authHeaders() {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
