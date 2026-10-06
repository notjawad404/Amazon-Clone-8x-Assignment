import { Link, useParams } from 'react-router-dom'
import AddressSummary from '../components/checkout/AddressSummary'
import BuyAgainButton from '../components/orders/BuyAgainButton'
import CancelOrderButton from '../components/orders/CancelOrderButton'
import OrderItems from '../components/orders/OrderItems'
import OrderTimeline from '../components/orders/OrderTimeline'
import OrderTotals from '../components/orders/OrderTotals'
import StatusBadge from '../components/orders/StatusBadge'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import { buttonClasses } from '../components/ui/buttonStyles'
import ErrorState from '../components/ui/ErrorState'
import Skeleton from '../components/ui/Skeleton'
import { useGetOrderQuery } from '../features/orders/ordersApi'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { parseApiError } from '../utils/apiError'
import { formatCard } from '../utils/cards'
import { formatCents } from '../utils/money'
import { deliveryText, formatOrderDate, needsPayment } from '../utils/orderStatus'
import NotFoundPage from './NotFoundPage'

const CRUMBS = [
  { label: 'Your Account', to: '/account' },
  { label: 'Your Orders', to: '/orders' },
  { label: 'Order Details' },
]
const PAYMENT_STATUS = {
  unpaid: 'Not paid',
  paid: 'Paid',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
}

function Panel({ title, children }) {
  return (
    <section className="rounded-lg border border-gray-300 bg-white p-4">
      <h2 className="mb-2 text-base font-bold">{title}</h2>
      {children}
    </section>
  )
}

function PaymentPanel({ order }) {
  const { payment } = order
  const refunds = payment?.refunds ?? []
  return (
    <div className="space-y-1 text-sm">
      <p>{formatCard(payment?.card ?? order.paymentMethod) ?? 'No card on file yet'}</p>
      <p>
        Status: <span className="font-bold">{PAYMENT_STATUS[order.paymentStatus]}</span>
      </p>
      {payment?.receiptUrl && (
        <a
          href={payment.receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-link hover:text-link-hover hover:underline"
        >
          View receipt<span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
      {refunds.length > 0 && (
        <ul className="border-t border-gray-200 pt-2">
          {refunds.map((refund) => (
            <li key={refund.createdAt}>
              Refund of {formatCents(refund.amountCents)} on {formatOrderDate(refund.createdAt)} ·{' '}
              {refund.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function OrderDetail({ order }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span>Ordered on {formatOrderDate(order.placedAt)}</span>
        <span aria-hidden="true" className="h-4 border-l border-gray-400" />
        <span>Order# {order.orderNumber}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Shipping address">
          <div className="text-sm">
            <AddressSummary address={order.shippingAddress} />
          </div>
        </Panel>
        <Panel title="Payment method">
          <PaymentPanel order={order} />
        </Panel>
        <Panel title="Order summary">
          <OrderTotals order={order} />
        </Panel>
      </div>
      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
        <section className="rounded-lg border border-gray-300 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{deliveryText(order)}</h2>
            <StatusBadge order={order} />
          </div>
          <OrderItems items={order.items} />
        </section>
        <div className="space-y-2">
          {needsPayment(order) && (
            <Link
              to={`/order/${order.orderNumber}/confirmation`}
              className={buttonClasses('orange', 'w-full')}
            >
              Complete payment
            </Link>
          )}
          <BuyAgainButton orderNumber={order.orderNumber} />
          {order.canCancel && <CancelOrderButton order={order} />}
        </div>
      </div>
      <Panel title="Order progress">
        <OrderTimeline order={order} />
      </Panel>
    </div>
  )
}

export default function OrderDetailPage() {
  const { orderNumber } = useParams()
  useDocumentTitle('Order Details')
  const { currentData: order, error, isError, isFetching, refetch } = useGetOrderQuery(orderNumber)

  if (isError && (parseApiError(error).code === 'order_not_found' || error?.status === 400)) {
    return <NotFoundPage />
  }

  let content
  if (isError) {
    content = (
      <ErrorState title="We couldn’t load this order" onRetry={refetch} isRetrying={isFetching} />
    )
  } else if (!order) content = <Skeleton className="h-96 w-full" />
  else content = <OrderDetail order={order} />

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumbs items={CRUMBS} className="mb-3" />
      <h1 className="mb-3 text-3xl">Order Details</h1>
      {content}
    </div>
  )
}
