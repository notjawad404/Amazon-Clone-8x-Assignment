import { Navigate, Outlet, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { safeRedirect } from '../utils/redirect'

export default function GuestOnlyRoute() {
  const { isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()

  if (isAuthenticated) {
    return <Navigate to={safeRedirect(searchParams.get('redirect'))} replace />
  }
  return <Outlet />
}
