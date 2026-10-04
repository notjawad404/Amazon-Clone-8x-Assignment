import { Outlet } from 'react-router-dom'
import Spinner from './components/ui/Spinner'
import { useGetMeQuery } from './features/auth/authApi'
import { useAuth } from './hooks/useAuth'

export default function App() {
  useGetMeQuery()
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="h-15 bg-nav" />
        <div className="h-10 bg-nav-light" />
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" label="Loading your account" />
        </div>
      </div>
    )
  }
  return <Outlet />
}
