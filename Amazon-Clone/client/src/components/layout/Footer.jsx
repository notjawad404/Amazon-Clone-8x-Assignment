import { APP_NAME } from '../../utils/constants'

export default function Footer() {
  return (
    <footer className="bg-nav-light px-4 py-8 text-center text-xs text-gray-300">
      <p>
        © {new Date().getFullYear()} {APP_NAME}. A demo store, not affiliated with Amazon.
      </p>
    </footer>
  )
}
