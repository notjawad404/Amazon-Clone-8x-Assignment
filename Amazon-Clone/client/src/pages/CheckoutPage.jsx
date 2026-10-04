import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { Link, Navigate } from 'react-router-dom'
import CheckoutForm from '../components/checkout/CheckoutForm'
import { buttonClasses } from '../components/ui/buttonStyles'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import Skeleton from '../components/ui/Skeleton'
import { checkoutFinished } from '../features/checkout/checkoutSlice'
import { useCheckoutSession } from '../hooks/useCheckoutSession'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { parseApiError } from '../utils/apiError'

// Loaded only with this page's chunk, so Stripe.js isn't fetched on other pages.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

function CheckoutSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading checkout"
      className="grid gap-6 lg:grid-cols-[1fr_18rem]"
    >
      <div className="space-y-4 rounded-lg bg-white p-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  )
}

function CompletedCheckout({ orderNumber }) {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(checkoutFinished())
  }, [dispatch])
  return <Navigate to={orderNumber ? `/order/${orderNumber}/confirmation` : '/orders'} replace />
}

function CheckoutContent() {
  const { checkout, error, isRetrying, retry } = useCheckoutSession()

  if (error && parseApiError(error).code === 'cart_empty') {
    return (
      <EmptyState title="Your cart is empty" message="Add items to your cart to check out.">
        <Link to="/" className={buttonClasses('yellow', 'mt-5 px-6')}>
          Continue shopping
        </Link>
      </EmptyState>
    )
  }
  if (error) {
    return (
      <ErrorState
        title="We couldn’t load your checkout"
        message={parseApiError(error).message}
        onRetry={retry}
        isRetrying={isRetrying}
      />
    )
  }
  if (!checkout) return <CheckoutSkeleton />
  if (checkout.status === 'completed')
    return <CompletedCheckout orderNumber={checkout.orderNumber} />
  return <CheckoutForm key={checkout._id} checkout={checkout} />
}

export default function CheckoutPage() {
  useDocumentTitle('Checkout')

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-5">
        <Elements stripe={stripePromise}>
          <CheckoutContent />
        </Elements>
      </div>
    </div>
  )
}
