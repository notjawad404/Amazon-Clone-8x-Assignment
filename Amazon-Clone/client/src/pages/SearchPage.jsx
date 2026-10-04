import { Link, useParams } from 'react-router-dom'
import ProductCard from '../components/product/ProductCard'
import ActiveFilters from '../components/search/ActiveFilters'
import CategoryTiles from '../components/search/CategoryTiles'
import FilterSidebar from '../components/search/FilterSidebar'
import MobileFilters from '../components/search/MobileFilters'
import Pagination from '../components/search/Pagination'
import ResultsHeader from '../components/search/ResultsHeader'
import SortSelect from '../components/search/SortSelect'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import Skeleton from '../components/ui/Skeleton'
import { useGetCategoriesQuery, useSearchProductsQuery } from '../features/catalog/catalogApi'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSearchParamsState } from '../hooks/useSearchParamsState'
import { parseApiError } from '../utils/apiError'
import { DEFAULT_SORT } from '../utils/constants'
import { findCategory, hasActiveFilters, toSearchApiParams } from '../utils/search'
import NotFoundPage from './NotFoundPage'

const SKELETON_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8']
const GRID_CLASS = 'grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'

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

function NoResults({ query, isFiltered, departments }) {
  return (
    <EmptyState
      title={query ? `No results for “${query}”` : 'No products found'}
      message={
        isFiltered
          ? 'Try removing some filters to see more results.'
          : 'Try checking your spelling, using more general terms, or browsing a department.'
      }
      className="border border-gray-200"
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

function categoryCrumbs({ department, category }) {
  return [{ label: department.name, to: `/c/${department.slug}` }, { label: category.name }]
}

export default function SearchPage() {
  const { slug } = useParams()
  const { filters, setParams } = useSearchParamsState()
  const categorySlug = slug ?? filters.category
  const { data: departments = [] } = useGetCategoriesQuery()
  const placement = slug ? findCategory(departments, slug) : null

  const { data, currentData, error, isFetching, isError, refetch } = useSearchProductsQuery(
    toSearchApiParams(filters, categorySlug),
  )
  const results = isError ? null : currentData
  const isPending = !results && !isError

  const categoryName = placement?.category?.name ?? placement?.department.name
  const heading = slug ? (categoryName ?? results?.category?.name ?? '') : 'Results'
  useDocumentTitle(
    slug ? heading || 'Category' : filters.query ? `Search: ${filters.query}` : 'Search',
  )

  if (isError && parseApiError(error).code === 'category_not_found') return <NotFoundPage />

  const sidebarProps = {
    categorySlug,
    isCategoryRoute: Boolean(slug),
    // The previous facets stay visible while a filter change loads.
    facetBrands: data?.facets?.brands ?? [],
  }

  return (
    <div>
      <ResultsHeader results={results} query={filters.query}>
        <MobileFilters total={results?.total ?? null} {...sidebarProps} />
        <SortSelect
          sort={filters.sort}
          onChange={(sort) => setParams({ sort: sort === DEFAULT_SORT ? null : sort })}
        />
      </ResultsHeader>

      <div className="mx-auto flex max-w-page gap-6 px-3 py-4 sm:px-5">
        <aside aria-label="Filters" className="hidden w-56 shrink-0 md:block">
          <FilterSidebar {...sidebarProps} />
        </aside>

        <div className="min-w-0 flex-1">
          {placement?.category && (
            <Breadcrumbs items={categoryCrumbs(placement)} className="mb-2" />
          )}
          {slug && !heading && isPending ? (
            <Skeleton className="mb-3 h-8 w-48" />
          ) : (
            <h1 className={slug ? 'mb-3 text-2xl font-bold' : 'mb-3 text-xl font-bold'}>
              {heading}
            </h1>
          )}
          {placement && !placement.category && <CategoryTiles department={placement.department} />}
          <ActiveFilters />

          {isPending && <ResultsSkeleton />}
          {isError && (
            <ErrorState
              title="We couldn’t load these results"
              message="Check your connection and try again."
              onRetry={refetch}
              isRetrying={isFetching}
            />
          )}
          {results && !results.items.length && (
            <NoResults
              query={filters.query}
              isFiltered={hasActiveFilters(filters)}
              departments={departments}
            />
          )}
          {results && results.items.length > 0 && (
            <>
              <ul className={GRID_CLASS}>
                {results.items.map((product) => (
                  <li key={product._id}>
                    <ProductCard product={product} />
                  </li>
                ))}
              </ul>
              <Pagination page={results.page} pages={results.pages} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
