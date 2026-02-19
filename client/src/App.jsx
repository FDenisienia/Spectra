import { Routes, Route, Navigate } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import TournamentRouter from './components/TournamentRouter'
import AdminTournamentRouter from './components/AdminTournamentRouter'
import PublicLayout from './components/PublicLayout'
import PublicHome from './pages/PublicHome'
import AdminDashboard from './pages/AdminDashboard'
import Login from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<PublicHome />} />
        <Route path="torneo/:id" element={<TournamentRouter isAdmin={false} />} />
        <Route path="torneo/:id/equipo/:teamId" element={<TournamentRouter isAdmin={false} />} />
      </Route>
      <Route path="/torneo" element={<Navigate to="/" replace />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
      <Route path="/admin/torneo/:id" element={<RequireAuth><AdminTournamentRouter /></RequireAuth>} />
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
