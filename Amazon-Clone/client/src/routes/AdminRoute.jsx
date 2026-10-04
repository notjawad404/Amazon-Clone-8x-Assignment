import { Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import NotFoundPage from '../pages/NotFoundPage'

export default function AdminRoute() {
  const { isAdmin } = useAuth()
  return isAdmin ? <Outlet /> : <NotFoundPage />
}
