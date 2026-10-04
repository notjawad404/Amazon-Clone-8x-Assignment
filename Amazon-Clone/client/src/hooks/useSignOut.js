import { useNavigate } from 'react-router-dom'
import { useSignOutMutation } from '../features/auth/authApi'

export function useSignOut() {
  const navigate = useNavigate()
  const [signOut, { isLoading }] = useSignOutMutation()

  async function handleSignOut() {
    const result = await signOut()
    if (!result.error) navigate('/')
  }

  return { signOut: handleSignOut, isSigningOut: isLoading }
}
