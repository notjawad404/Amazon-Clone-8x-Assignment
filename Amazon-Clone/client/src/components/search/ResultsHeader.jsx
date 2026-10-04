import { SEARCH_PAGE_SIZE } from '../../utils/constants'
import Skeleton from '../ui/Skeleton'

function ResultsSummary({ results, query }) {
  const { total, page, items } = results
  const first = (page - 1) * SEARCH_PAGE_SIZE + 1
  const range = items.length ? `${first}-${first + items.length - 1} of ` : ''

  return (
    <p role="status" className="text-sm">
      {range}
      {total === 0 ? 'No' : total.toLocaleString('en-US')} {total === 1 ? 'result' : 'results'}
      {query && (
        <>
          {' for '}
          <span className="font-bold text-price">“{query}”</span>
        </>
      )}
    </p>
  )
}

export default function ResultsHeader({ results, query, children }) {
  return (
    <div className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5">
        {results ? (
          <ResultsSummary results={results} query={query} />
        ) : (
          <Skeleton className="h-5 w-56" />
        )}
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </div>
  )
}
