import { Link } from 'react-router-dom'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function NotFoundPage() {
  useDocumentTitle('Page not found')

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Sorry, we couldn&apos;t find that page</h1>
      <p className="mt-3 text-sm">
        Try going back to the{' '}
        <Link to="/" className="text-link hover:text-link-hover hover:underline">
          homepage
        </Link>
        .
      </p>
    </section>
  )
}
