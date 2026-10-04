import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSignOutMutation } from '../../features/auth/authApi'
import { useAuth } from '../../hooks/useAuth'
import { APP_NAME } from '../../utils/constants'
import { authPath } from '../../utils/redirect'
import Logo from './Logo'

const navItemClass =
  'rounded-sm border border-transparent px-2 py-1 hover:border-white focus-visible:border-white focus-visible:outline-none'

function AccountLinks() {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [signOut, { isLoading: isSigningOut }] = useSignOutMutation()

  async function handleSignOut() {
    const result = await signOut()
    if (!result.error) navigate('/')
  }

  if (!isAuthenticated) {
    return (
      <Link to={authPath('/signin', location.pathname + location.search)} className={navItemClass}>
        <span className="block text-xs font-normal">Hello, sign in</span>
        Account
      </Link>
    )
  }

  return (
    <>
      <Link to="/account" className={navItemClass}>
        <span className="block text-xs font-normal">Hello, {user.name.split(' ')[0]}</span>
        Account
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className={`${navItemClass} cursor-pointer disabled:opacity-60`}
      >
        Sign out
      </button>
    </>
  )
}

export default function Header() {
  return (
    <header className="bg-nav text-white">
      <div className="flex h-15 items-center gap-4 px-4">
        <Link to="/" aria-label={`${APP_NAME} home`} className={navItemClass}>
          <Logo />
        </Link>
        <nav aria-label="Account" className="ml-auto flex items-center gap-2 text-sm font-bold">
          <AccountLinks />
          <Link to="/orders" className={navItemClass}>
            <span className="block text-xs font-normal">Returns</span>& Orders
          </Link>
          <Link to="/cart" className={navItemClass}>
            Cart
          </Link>
        </nav>
      </div>
      <div className="h-10 bg-nav-light" />
    </header>
  )
}
