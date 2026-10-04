import { Link, useParams, useSearchParams } from 'react-router-dom'
import ProductCard from '../components/product/ProductCard'
import SimplePagination from '../components/search/SimplePagination'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import Skeleton from '../components/ui/Skeleton'
import { useGetCategoriesQuery, useSearchProductsQuery } from '../features/catalog/catalogApi'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { parseApiError } from '../utils/apiError'
import { SEARCH_PAGE_SIZE } from '../utils/constants'
import NotFoundPage from './NotFoundPage'

const SKELETON_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8']
const GRID_CLASS = 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'

function readPage(value) {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

function ResultsSkeleton() {
  return (
    <div className={GRID_CLASS} aria-hidden="true">
      {SKELETON_KEYS.map((key) => (
        <div key={key} className="rounded-sm border border-gray-200 bg-white p-3">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="mt-3 h-4 w-5/6" />
          <Skeleton className="mt-2 h-4 w-1/2" />
          <Skeleton className="mt-2 h-6 w-1/3" />
        </div>
      ))}
    </div>
  )
}

function NoResults({ query }) {
  const { data: departments = [] } = useGetCategoriesQuery()

  return (
    <EmptyState
      title={query ? `No results for “${query}”` : 'No products found'}
      message="Try checking your spelling, using more general terms, or browsing a department."
    >
      <ul className="mt-5 flex flex-wrap justify-center gap-2">
        {departments.map((department) => (
          <li key={department._id}>
            <Link
              to={`/c/${department.slug}`}
              className="block rounded-full border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50 focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none"
            >
              {department.name}
            </Link>
          </li>
        ))}
      </ul>
    </EmptyState>
  )
}

function ResultsSummary({ results, query }) {
  const { total, page, items } = results
  const first = (page - 1) * SEARCH_PAGE_SIZE + 1
  const range = total ? `${first}-${first + items.length - 1} of ` : ''

  return (
    <p className="text-sm">
      {range}
      {total} {total === 1 ? 'result' : 'results'}
      {query && (
        <>
          {' for '}
          <span className="font-bold text-price">“{query}”</span>
        </>
      )}
    </p>
  )
}

export default function SearchPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('k')?.trim() ?? ''
  const category = slug ?? searchParams.get('category') ?? ''
  const page = readPage(searchParams.get('page'))

  const { currentData, error, isFetching, isError, refetch } = useSearchProductsQuery({
    q: query || undefined,
    category: category || undefined,
    page,
    limit: SEARCH_PAGE_SIZE,
  })
  const results = isError ? null : currentData
  const isPending = !results && !isError

  const heading = slug ? (results?.category?.name ?? '') : 'Results'
  useDocumentTitle(slug ? heading || 'Category' : query ? `Search: ${query}` : 'Search')

  if (isError && parseApiError(error).code === 'category_not_found') return <NotFoundPage />

  return (
    <div className="bg-page">
      <section className="mx-auto max-w-page px-3 py-4 sm:px-5">
        <div className="mb-4 rounded-sm bg-white px-4 py-3 shadow-sm">
          {isPending ? (
            <Skeleton className="h-5 w-64" />
          ) : (
            results && <ResultsSummary results={results} query={query} />
          )}
        </div>

        <h1 className={slug ? 'mb-3 text-2xl font-bold' : 'mb-3 text-xl font-bold'}>{heading}</h1>

        {isPending && <ResultsSkeleton />}
        {isError && (
          <ErrorState
            title="We couldn’t load these results"
            message="Check your connection and try again."
            onRetry={refetch}
            isRetrying={isFetching}
          />
        )}
        {results && !results.items.length && <NoResults query={query} />}
        {results && results.items.length > 0 && (
          <div>
            <ul className={GRID_CLASS}>
              {results.items.map((product) => (
                <li key={product._id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
            <SimplePagination page={results.page} pages={results.pages} />
          </div>
        )}
      </section>
    </div>
  )
}
