import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Tournament from './pages/Tournament'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/torneo/:id" element={<Tournament />} />
      <Route path="/torneo" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
