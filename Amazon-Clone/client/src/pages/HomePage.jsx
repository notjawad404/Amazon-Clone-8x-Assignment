import CategoryCardGrid from '../components/home/CategoryCardGrid'
import HeroCarousel from '../components/home/HeroCarousel'
import ProductRow from '../components/home/ProductRow'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import { useGetCategoriesQuery, useGetHomeQuery } from '../features/catalog/catalogApi'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { APP_NAME } from '../utils/constants'

export default function HomePage() {
  useDocumentTitle(null)
  const categories = useGetCategoriesQuery()
  const home = useGetHomeQuery()

  const isLoading = categories.isLoading || home.isLoading
  const isError = categories.isError || home.isError
  const { bestSellers = [], newArrivals = [], deals = [], topRated = [] } = home.data ?? {}
  const isEmpty = !isLoading && !isError && !bestSellers.length && !deals.length

  function retry() {
    if (categories.isError) categories.refetch()
    if (home.isError) home.refetch()
  }

  return (
    <div className="bg-page pb-8">
      <h1 className="sr-only">{APP_NAME} home</h1>
      <div className="mx-auto max-w-page">
        <HeroCarousel />
        <div className="relative z-10 flex flex-col gap-5 px-3 sm:px-5 lg:-mt-80">
          {isError && (
            <ErrorState
              title="We couldn’t load the store"
              message="Check your connection and try again."
              onRetry={retry}
              isRetrying={categories.isFetching || home.isFetching}
            />
          )}
          {isEmpty && (
            <EmptyState
              title="Nothing to show yet"
              message="New products are on the way. Please check back soon."
            />
          )}
          {!isError && !isEmpty && (
            <>
              <CategoryCardGrid departments={categories.data} isLoading={isLoading} />
              <ProductRow
                title="Today’s Deals"
                products={deals}
                isLoading={isLoading}
                tone="promo"
                isDeal
              />
              <ProductRow title="Best Sellers" products={bestSellers} isLoading={isLoading} />
              <ProductRow title="New Arrivals" products={newArrivals} isLoading={isLoading} />
              {topRated.map(({ department, products }) => (
                <ProductRow
                  key={department._id}
                  title={`Top Rated in ${department.name}`}
                  products={products}
                  seeAllTo={`/c/${department.slug}`}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
