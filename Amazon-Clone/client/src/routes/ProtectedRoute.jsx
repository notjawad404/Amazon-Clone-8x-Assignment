import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { authPath } from '../utils/redirect'

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={authPath('/signin', location.pathname + location.search)} replace />
  }
  return <Outlet />
}
