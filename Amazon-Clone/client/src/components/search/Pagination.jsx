import { Link, useSearchParams } from 'react-router-dom'

const SIBLING_COUNT = 1
const ITEM_CLASS = 'flex h-10 min-w-10 items-center justify-center rounded-md px-3 text-sm'
const LINK_CLASS = `${ITEM_CLASS} border border-transparent hover:border-gray-300 hover:bg-gray-50 focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none`

// First, last, and the pages around the current one; null marks a gap.
function pageNumbers(page, pages) {
  const numbers = []
  for (let number = 1; number <= pages; number += 1) {
    const isNearby = Math.abs(number - page) <= SIBLING_COUNT
    if (number === 1 || number === pages || isNearby) numbers.push(number)
    else if (numbers.at(-1) !== null) numbers.push(null)
  }
  return numbers
}

function StepLink({ to, children }) {
  if (!to) {
    return (
      <span aria-disabled="true" className={`${ITEM_CLASS} text-gray-500`}>
        {children}
      </span>
    )
  }
  return (
    <Link to={to} className={LINK_CLASS}>
      {children}
    </Link>
  )
}

export default function Pagination({ page, pages }) {
  const [searchParams] = useSearchParams()
  if (pages <= 1) return null

  function pageLink(target) {
    const params = new URLSearchParams(searchParams)
    if (target === 1) params.delete('page')
    else params.set('page', target)
    return `?${params}`
  }

  const numbers = pageNumbers(page, pages)

  return (
    <nav aria-label="Pagination" className="mt-8 flex justify-center">
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          <StepLink to={page > 1 && pageLink(page - 1)}>‹ Previous</StepLink>
        </li>
        {numbers.map((number, index) =>
          number === null ? (
            <li key={`gap-after-${numbers[index - 1]}`} aria-hidden="true" className={ITEM_CLASS}>
              …
            </li>
          ) : (
            <li key={number}>
              {number === page ? (
                <span
                  aria-current="page"
                  className={`${ITEM_CLASS} border border-gray-900 font-bold`}
                >
                  {number}
                </span>
              ) : (
                <Link to={pageLink(number)} aria-label={`Page ${number}`} className={LINK_CLASS}>
                  {number}
                </Link>
              )}
            </li>
          ),
        )}
        <li>
          <StepLink to={page < pages && pageLink(page + 1)}>Next ›</StepLink>
        </li>
      </ul>
    </nav>
  )
}
