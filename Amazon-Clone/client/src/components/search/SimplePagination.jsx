import { Link, useSearchParams } from 'react-router-dom'

const LINK_CLASS =
  'rounded-md border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm hover:bg-gray-50 focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none'

export default function SimplePagination({ page, pages }) {
  const [searchParams] = useSearchParams()
  if (pages <= 1) return null

  function pageLink(target) {
    const params = new URLSearchParams(searchParams)
    if (target === 1) params.delete('page')
    else params.set('page', target)
    return `?${params}`
  }

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4">
      {page > 1 && (
        <Link to={pageLink(page - 1)} className={LINK_CLASS}>
          ‹ Previous
        </Link>
      )}
      <span className="text-sm text-gray-700">
        Page {page} of {pages}
      </span>
      {page < pages && (
        <Link to={pageLink(page + 1)} className={LINK_CLASS}>
          Next ›
        </Link>
      )}
    </nav>
  )
}
