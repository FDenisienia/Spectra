import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import PublicHome from './pages/PublicHome'

const TournamentRouter = lazy(() => import('./components/TournamentRouter'))
const AdminTournamentRouter = lazy(() => import('./components/AdminTournamentRouter'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const Login = lazy(() => import('./pages/Login'))
const RequireAuth = lazy(() => import('./components/RequireAuth'))

function RouteFallback() {
  return (
    <div className="route-loading d-flex flex-column justify-content-center align-items-center py-5 gap-2" style={{ minHeight: '42vh' }}>
      <div className="home-loading-spinner" role="status" aria-label="Cargando" />
      <span className="small text-muted">Cargando…</span>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<PublicHome />} />
          <Route path="torneo/:id" element={<TournamentRouter isAdmin={false} />} />
          <Route path="torneo/:id/equipo/:teamId" element={<TournamentRouter isAdmin={false} />} />
        </Route>
        <Route path="/torneo" element={<Navigate to="/" replace />} />
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin"
          element={(
            <RequireAuth>
              <AdminDashboard />
            </RequireAuth>
          )}
        />
        <Route
          path="/admin/torneo/:id"
          element={(
            <RequireAuth>
              <AdminTournamentRouter />
            </RequireAuth>
          )}
        />
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Suspense>
  )
}
