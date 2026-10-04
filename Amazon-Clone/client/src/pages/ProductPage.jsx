import { useDispatch } from 'react-redux'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ProductRow from '../components/home/ProductRow'
import BuyBox from '../components/product/BuyBox'
import ImageGallery from '../components/product/ImageGallery'
import ProductInfoTable from '../components/product/ProductInfoTable'
import ProductSkeleton from '../components/product/ProductSkeleton'
import ProductSummary from '../components/product/ProductSummary'
import RatingHistogram from '../components/product/RatingHistogram'
import ReviewList from '../components/product/ReviewList'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import ErrorState from '../components/ui/ErrorState'
import { useGetProductQuery, useGetRelatedQuery } from '../features/catalog/catalogApi'
import { buyNowStarted } from '../features/checkout/checkoutSlice'
import { useCart } from '../hooks/useCart'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { parseApiError } from '../utils/apiError'
import NotFoundPage from './NotFoundPage'

function pickVariant(variants, variantId) {
  return (
    variants.find((variant) => variant._id === variantId) ??
    variants.find((variant) => variant.isDefault) ??
    variants[0]
  )
}

function RelatedProducts({ slug }) {
  const { currentData = [], isLoading } = useGetRelatedQuery(slug)
  return (
    <ProductRow
      title="Products related to this item"
      products={currentData}
      isLoading={isLoading}
    />
  )
}

export default function ProductPage() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { add } = useCart()
  const { currentData: product, error, isError, isFetching, refetch } = useGetProductQuery(slug)
  useDocumentTitle(product?.title ?? 'Product')

  if (isError && parseApiError(error).code === 'product_not_found') return <NotFoundPage />
  if (isError) {
    return (
      <ErrorState
        title="We couldn’t load this product"
        message="Check your connection and try again."
        onRetry={refetch}
        isRetrying={isFetching}
        className="mx-auto my-10 max-w-xl"
      />
    )
  }
  if (!product) return <ProductSkeleton />

  const variant = pickVariant(product.variants, searchParams.get('v'))
  const images = variant.images.length ? variant.images : product.images
  const item = (qty) => ({ productId: product._id, variantId: variant._id, qty })

  function selectVariant(variantId) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.set('v', variantId)
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }

  function buyNow(qty) {
    dispatch(buyNowStarted(item(qty)))
    navigate('/checkout')
  }

  return (
    <div className="mx-auto max-w-page px-3 py-4 sm:px-5">
      {product.breadcrumbs.length > 0 && (
        <Breadcrumbs
          items={product.breadcrumbs.map(({ name, slug: categorySlug }) => ({
            label: name,
            to: `/c/${categorySlug}`,
          }))}
          className="mb-4"
        />
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_16rem]">
        <div className="md:row-span-2 lg:row-span-1">
          <ImageGallery key={images[0]?.url} images={images} title={product.title} />
        </div>
        <ProductSummary product={product} variant={variant} onSelectVariant={selectVariant} />
        <div className="md:col-start-2 lg:col-start-3 lg:row-start-1">
          <BuyBox
            key={variant._id}
            variant={variant}
            returnPolicy={product.specs.returnPolicy}
            onAddToCart={(qty) =>
              add({ ...item(qty), maxQty: variant.stock, priceCents: variant.priceCents })
            }
            onBuyNow={buyNow}
          />
        </div>
      </div>

      <div className="mt-8 space-y-8 border-t border-gray-200 pt-6">
        <ProductInfoTable brand={product.brand} specs={product.specs} />
        <section aria-labelledby="description-heading">
          <h2 id="description-heading" className="mb-2 text-xl font-bold">
            Product description
          </h2>
          <p className="max-w-4xl text-sm whitespace-pre-line">{product.description}</p>
        </section>
      </div>

      <div className="-mx-3 mt-8 border-t border-gray-200 sm:-mx-5">
        <RelatedProducts slug={slug} />
      </div>

      <section
        id="reviews"
        aria-labelledby="reviews-heading"
        className="mt-6 grid scroll-mt-4 gap-8 border-t border-gray-200 pt-6 lg:grid-cols-[18rem_minmax(0,1fr)]"
      >
        <div>
          <h2 id="reviews-heading" className="mb-2 text-xl font-bold">
            Customer reviews
          </h2>
          <RatingHistogram
            ratingAvg={product.ratingAvg}
            ratingCount={product.ratingCount}
            breakdown={product.ratingBreakdown}
          />
        </div>
        <ReviewList key={slug} slug={slug} />
      </section>
    </div>
  )
}
