import { Link } from 'react-router-dom'
import { formatCard } from '../../utils/cards'
import { formatDeliveryDate } from '../../utils/delivery'
import AddressSummary from '../checkout/AddressSummary'
import { buttonClasses } from '../ui/buttonStyles'
import Icon from '../ui/Icon'
import OrderItems from './OrderItems'
import OrderTotals from './OrderTotals'

const paidOn = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

function Panel({ title, children }) {
  return (
    <section className="rounded-lg border border-gray-300 bg-white p-4">
      <h2 className="mb-2 text-base font-bold">{title}</h2>
      {children}
    </section>
  )
}

function PaymentSummary({ order }) {
  const { payment } = order
  return (
    <div className="space-y-1 text-sm">
      <p>{formatCard(payment?.card ?? order.paymentMethod) ?? 'Card'}</p>
      {order.paidAt && (
        <p className="text-success">Paid on {paidOn.format(new Date(order.paidAt))}</p>
      )}
      {payment?.receiptUrl && (
        <a
          href={payment.receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-link hover:text-link-hover hover:underline"
        >
          View receipt
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </div>
  )
}

export default function OrderPlaced({ order }) {
  return (
    <div className="space-y-4">
      <section
        aria-labelledby="placed-heading"
        className="rounded-lg border border-gray-300 bg-white p-5"
      >
        <h1 id="placed-heading" className="flex items-center gap-2 text-xl font-bold text-success">
          <Icon name="check" className="size-7 rounded-full bg-success p-1 text-white" />
          Order placed, thanks!
        </h1>
        <p className="mt-2 text-sm">Confirmation will be sent to your email.</p>
        <p className="mt-1 text-sm">
          Order number: <span className="font-bold">{order.orderNumber}</span>
        </p>
        <p className="mt-3 text-lg">
          Arriving{' '}
          <span className="font-bold text-success">
            {formatDeliveryDate(order.estimatedDelivery, 'long')}
          </span>
        </p>
        <p className="text-sm text-gray-700">{order.deliveryLabel} delivery</p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Shipping to">
          <div className="text-sm">
            <AddressSummary address={order.shippingAddress} />
          </div>
        </Panel>
        <Panel title="Payment">
          <PaymentSummary order={order} />
        </Panel>
      </div>

      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
        <Panel title="Items in this order">
          <OrderItems items={order.items} />
        </Panel>
        <Panel title="Order summary">
          <OrderTotals order={order} />
        </Panel>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to={`/orders/${order.orderNumber}`} className={buttonClasses('yellow', 'px-6')}>
          Review or edit your order
        </Link>
        <Link to="/" className={buttonClasses('outline', 'px-6')}>
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
