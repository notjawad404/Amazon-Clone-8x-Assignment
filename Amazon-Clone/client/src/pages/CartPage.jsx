import { useDispatch } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'
import CartItem from '../components/cart/CartItem'
import SavedItem from '../components/cart/SavedItem'
import SubtotalBox, { SubtotalLine } from '../components/cart/SubtotalBox'
import Alert from '../components/ui/Alert'
import { buttonClasses } from '../components/ui/buttonStyles'
import ErrorState from '../components/ui/ErrorState'
import Skeleton from '../components/ui/Skeleton'
import { cartCheckoutRequested } from '../features/checkout/checkoutSlice'
import { useCart, useCartContents } from '../hooks/useCart'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

const SKELETON_KEYS = ['c1', 'c2', 'c3']

function CartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your cart" className="space-y-4 bg-white p-5">
      <Skeleton className="h-8 w-56" />
      {SKELETON_KEYS.map((key) => (
        <div key={key} className="flex gap-4 border-t border-gray-200 pt-4">
          <Skeleton className="size-24 sm:size-36" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-40" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyCart({ isAuthenticated }) {
  return (
    <div className="py-4">
      <h1 className="text-2xl font-bold sm:text-3xl">Your Cart is empty</h1>
      <Link
        to="/"
        className="mt-2 inline-block text-sm text-link hover:text-link-hover hover:underline"
      >
        Shop today’s deals
      </Link>
      {!isAuthenticated && (
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/signin?redirect=/cart" className={buttonClasses('yellow', 'px-5')}>
            Sign in to your account
          </Link>
          <Link to="/signup?redirect=/cart" className={buttonClasses('outline', 'px-5')}>
            Sign up now
          </Link>
        </div>
      )}
    </div>
  )
}

function CartList({ cart, lines, isUpdating }) {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl">Shopping Cart</h1>
      <p
        aria-hidden="true"
        className="mt-2 hidden border-b border-gray-200 pb-1 text-right text-sm text-gray-600 sm:block"
      >
        Price
      </p>
      <ul aria-label="Items in your cart">
        {lines.map((line) => (
          <CartItem key={line._id} line={line} isUpdating={isUpdating} />
        ))}
      </ul>
      <SubtotalLine cart={cart} isUpdating={isUpdating} className="pt-3 text-right" />
    </>
  )
}

export default function CartPage() {
  useDocumentTitle('Shopping Cart')
  const { isAuthenticated } = useCart()
  const { cart, isError, isFetching, refetch } = useCartContents()
  const dispatch = useDispatch()
  const notice = useLocation().state?.notice

  if (isError) {
    return (
      <div className="bg-page px-3 py-6">
        <ErrorState
          title="We couldn’t load your cart"
          message="Check your connection and try again."
          onRetry={refetch}
          isRetrying={isFetching}
          className="mx-auto max-w-xl"
        />
      </div>
    )
  }

  const inCart = cart?.items.filter((line) => !line.savedForLater) ?? []
  const saved = cart?.items.filter((line) => line.savedForLater) ?? []

  return (
    <div className="bg-page">
      <div className="mx-auto grid max-w-page items-start gap-5 px-3 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-5">
          {notice && (
            <Alert variant="info" className="bg-white">
              {notice}
            </Alert>
          )}
          {!cart ? (
            <CartSkeleton />
          ) : (
            <section className="bg-white p-5">
              {inCart.length ? (
                <CartList cart={cart} lines={inCart} isUpdating={isFetching} />
              ) : (
                <EmptyCart isAuthenticated={isAuthenticated} />
              )}
            </section>
          )}
          {saved.length > 0 && (
            <section aria-labelledby="saved-heading" className="bg-white p-5">
              <h2 id="saved-heading" className="border-b border-gray-200 pb-2 text-xl font-bold">
                Saved for later ({saved.length} {saved.length === 1 ? 'item' : 'items'})
              </h2>
              <ul>
                {saved.map((line) => (
                  <SavedItem key={line._id} line={line} />
                ))}
              </ul>
            </section>
          )}
        </div>
        {cart && inCart.length > 0 && (
          <div className="-order-1 lg:sticky lg:top-4 lg:order-0">
            <SubtotalBox
              cart={cart}
              isUpdating={isFetching}
              onCheckout={() => dispatch(cartCheckoutRequested())}
            />
          </div>
        )}
      </div>
    </div>
  )
}
