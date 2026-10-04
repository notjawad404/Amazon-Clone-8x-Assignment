import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function PlaceholderPage({ title }) {
  useDocumentTitle(title)

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-normal">{title}</h1>
      <p className="mt-2 text-sm text-gray-600">This page is not built yet.</p>
    </section>
  )
}
