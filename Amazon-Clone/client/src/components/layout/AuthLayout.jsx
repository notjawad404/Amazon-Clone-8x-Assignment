import { Link } from 'react-router-dom'
import { APP_NAME } from '../../utils/constants'
import Logo from './Logo'

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex justify-center pt-3 pb-4">
        <Link
          to="/"
          aria-label={`${APP_NAME} home`}
          className="rounded-sm px-2 py-1 focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none"
        >
          <Logo tone="dark" />
        </Link>
      </header>
      {children}
      <footer className="mt-10 border-t border-gray-300 bg-linear-to-b from-gray-50 to-white px-4 pt-6 pb-10 text-center text-xs">
        <Link to="/" className="text-link hover:text-link-hover hover:underline">
          Back to {APP_NAME}
        </Link>
        <p className="mt-3 text-gray-600">
          © {new Date().getFullYear()} {APP_NAME}. A demo store, not affiliated with Amazon.
        </p>
      </footer>
    </div>
  )
}
