import { useSelector } from 'react-redux'
import { selectAuthStatus, selectCurrentUser } from '../features/auth/authSlice'

export function useAuth() {
  const user = useSelector(selectCurrentUser)
  const status = useSelector(selectAuthStatus)

  return {
    user,
    isAuthenticated: status === 'authenticated',
    isAdmin: user?.role === 'admin',
    isLoading: status === 'idle',
  }
}
