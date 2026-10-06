import { statusLabel } from '../../utils/orderStatus'

const TONES = {
  paid: 'bg-link/10 text-link',
  shipped: 'bg-link/10 text-link',
  delivered: 'bg-success/10 text-success',
  cancelled: 'bg-gray-200 text-gray-800',
}

const PAYMENT_TONES = {
  awaiting: 'bg-btn-yellow/30 text-ink',
  confirming: 'bg-link/10 text-link',
  failed: 'bg-error/10 text-error',
}

export default function StatusBadge({ order }) {
  const tone =
    order.status === 'pending_payment'
      ? (PAYMENT_TONES[order.paymentState] ?? PAYMENT_TONES.awaiting)
      : TONES[order.status]
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>
      {statusLabel(order)}
    </span>
  )
}
