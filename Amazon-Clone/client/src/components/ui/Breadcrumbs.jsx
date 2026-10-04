import { Link } from 'react-router-dom'

export default function Breadcrumbs({ items, className = '' }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 text-xs text-gray-700">
        {items.map(({ label, to }, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={to ?? label} className="flex items-center gap-2">
              {!to ? (
                <span aria-current="page" className="text-ink">
                  {label}
                </span>
              ) : (
                <>
                  <Link
                    to={to}
                    className="rounded-sm hover:text-link-hover hover:underline focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none"
                  >
                    {label}
                  </Link>
                  {!isLast && <span aria-hidden="true">›</span>}
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
