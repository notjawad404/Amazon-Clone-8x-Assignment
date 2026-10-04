import { useLocation, useParams } from 'react-router-dom'
import OrderCancelled from '../components/orders/OrderCancelled'
import OrderPlaced from '../components/orders/OrderPlaced'
import { Confirming, PaymentFailed, StillConfirming } from '../components/orders/PaymentPending'
import ErrorState from '../components/ui/ErrorState'
import Skeleton from '../components/ui/Skeleton'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useOrderConfirmation } from '../hooks/useOrderConfirmation'
import { parseApiError } from '../utils/apiError'
import NotFoundPage from './NotFoundPage'

function ConfirmationSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your order" className="space-y-4">
      <Skeleton className="h-36 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams()
  const justPaid = Boolean(useLocation().state?.justPaid)
  const { order, view, error, isError, isFetching, refetch, onPaymentSubmitted } =
    useOrderConfirmation(orderNumber, { justPaid })
  useDocumentTitle(view === 'placed' ? 'Order placed' : 'Order confirmation')

  if (isError && parseApiError(error).code === 'order_not_found') return <NotFoundPage />
  if (isError && error?.status === 400) return <NotFoundPage />

  let content
  if (isError) {
    content = (
      <ErrorState
        title="We couldn’t load your order"
        message="Check your connection and try again."
        onRetry={refetch}
        isRetrying={isFetching}
      />
    )
  } else if (!order) content = <ConfirmationSkeleton />
  else if (view === 'placed') content = <OrderPlaced order={order} />
  else if (view === 'cancelled') content = <OrderCancelled order={order} />
  else if (view === 'failed') {
    content = <PaymentFailed order={order} onRetried={onPaymentSubmitted} />
  } else if (view === 'stillConfirming') {
    content = <StillConfirming order={order} onRetried={onPaymentSubmitted} />
  } else content = <Confirming />

  return (
    <div className="bg-page">
      <div className="mx-auto max-w-5xl px-3 py-6 sm:px-5">{content}</div>
    </div>
  )
}
