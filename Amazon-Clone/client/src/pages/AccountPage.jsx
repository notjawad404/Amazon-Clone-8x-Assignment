import { Link } from 'react-router-dom'
import Icon from '../components/ui/Icon'
import { useAuth } from '../hooks/useAuth'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const TILE =
  'flex h-full gap-4 rounded-lg border border-gray-300 bg-white p-5 hover:bg-gray-50 focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none'

function LinkTile({ to, icon, title, children }) {
  return (
    <li>
      <Link to={to} className={TILE}>
        <Icon name={icon} className="size-10 text-btn-orange" strokeWidth={1.5} />
        <span>
          <span className="block text-lg">{title}</span>
          <span className="block text-sm text-gray-700">{children}</span>
        </span>
      </Link>
    </li>
  )
}

export default function AccountPage() {
  useDocumentTitle('Your Account')
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-5 text-3xl">Your Account</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LinkTile to="/orders" icon="cart" title="Your Orders">
          Track, cancel, or buy things again
        </LinkTile>
        <li className="flex gap-4 rounded-lg border border-gray-300 bg-white p-5">
          <Icon name="lock" className="size-10 text-btn-orange" strokeWidth={1.5} />
          <div className="min-w-0">
            <h2 className="text-lg">Login &amp; security</h2>
            <dl className="mt-1 text-sm">
              <dt className="font-bold">Name</dt>
              <dd>{user.name}</dd>
              <dt className="mt-1 font-bold">Email</dt>
              <dd className="break-all">{user.email}</dd>
            </dl>
          </div>
        </li>
        <LinkTile to="/account/addresses" icon="location" title="Your Addresses">
          Edit, remove, or set a default address
        </LinkTile>
      </ul>
    </div>
  )
}
