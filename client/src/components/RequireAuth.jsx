import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Spinner } from 'react-bootstrap'
import { getStoredToken, getMe } from '../api/auth'

export default function RequireAuth({ children }) {
  const location = useLocation()
  const [status, setStatus] = useState('loading') // 'loading' | 'ok' | 'fail'

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setStatus('fail')
      return
    }
    getMe()
      .then((user) => setStatus(user ? 'ok' : 'fail'))
      .catch(() => setStatus('fail'))
  }, [])

  if (status === 'loading') {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" />
      </div>
    )
  }
  if (status === 'fail') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }
  return children
}
