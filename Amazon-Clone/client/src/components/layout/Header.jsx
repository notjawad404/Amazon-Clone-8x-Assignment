import { Link } from 'react-router-dom'
import { APP_NAME } from '../../utils/constants'

const NAV_LINKS = [
  { to: '/signin', label: 'Sign in' },
  { to: '/orders', label: 'Orders' },
  { to: '/cart', label: 'Cart' },
]

const linkClass =
  'rounded-sm border border-transparent px-2 py-1 hover:border-white focus-visible:border-white focus-visible:outline-none'

export default function Header() {
  return (
    <header className="bg-nav text-white">
      <div className="flex h-15 items-center gap-4 px-4">
        <Link to="/" className={`${linkClass} text-2xl font-bold tracking-tight`}>
          {APP_NAME}
          <span className="text-accent">.</span>
        </Link>
        <nav aria-label="Account" className="ml-auto flex items-center gap-2 text-sm font-bold">
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className={linkClass}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="h-10 bg-nav-light" />
    </header>
  )
}
