import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="mx-auto max-w-screen-md px-4 py-16 text-center">
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
