import { Link } from 'react-router-dom'
import { buttonClasses } from '../ui/buttonStyles'

const REASONS = {
  reservation_expired: 'We didn’t receive your payment in time, so the items were released.',
  user_cancelled: 'You cancelled this order.',
  admin_cancelled: 'This order was cancelled by our team.',
}

export default function OrderCancelled({ order }) {
  const isRefunded = ['refunded', 'partially_refunded'].includes(order.paymentStatus)

  return (
    <div className="space-y-3 rounded-lg bg-white p-5">
      <h1 className="text-xl font-bold">This order was cancelled</h1>
      <p className="text-sm">
        Order number: <span className="font-bold">{order.orderNumber}</span>
      </p>
      <p className="text-sm">{REASONS[order.cancelReason] ?? REASONS.admin_cancelled}</p>
      {order.paymentStatus === 'unpaid' && <p className="text-sm">You haven’t been charged.</p>}
      {isRefunded && <p className="text-sm">Your payment has been refunded to your card.</p>}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link to="/cart" className={buttonClasses('yellow', 'px-6')}>
          Go to your cart
        </Link>
        <Link to="/" className={buttonClasses('outline', 'px-6')}>
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
