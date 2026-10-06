import { formatOrderDateTime, STATUS_LABELS } from '../../utils/orderStatus'

const STEP_LABELS = { ...STATUS_LABELS, pending_payment: 'Order placed', paid: 'Payment received' }
const HAPPY_PATH = ['pending_payment', 'paid', 'shipped', 'delivered']

export default function OrderTimeline({ order }) {
  const reached = new Set(order.statusHistory.map((step) => step.status))
  const upcoming =
    order.status === 'cancelled' ? [] : HAPPY_PATH.filter((status) => !reached.has(status))

  return (
    <ol aria-label="Order progress" className="space-y-3">
      {order.statusHistory.map((step) => (
        <li key={`${step.status}-${step.at}`} className="flex gap-3">
          <span
            aria-hidden="true"
            className={`mt-1 size-3 shrink-0 rounded-full ${step.status === 'cancelled' ? 'bg-error' : 'bg-success'}`}
          />
          <div className="text-sm">
            <p className="font-bold">{STEP_LABELS[step.status]}</p>
            <p className="text-gray-600">{formatOrderDateTime(step.at)}</p>
            {step.note && step.note !== STEP_LABELS[step.status] && (
              <p className="text-gray-700">{step.note}</p>
            )}
          </div>
        </li>
      ))}
      {upcoming.map((status) => (
        <li key={status} className="flex gap-3 text-gray-500">
          <span
            aria-hidden="true"
            className="mt-1 size-3 shrink-0 rounded-full border-2 border-gray-300"
          />
          <p className="text-sm">
            {STEP_LABELS[status]}
            <span className="sr-only"> (not yet)</span>
          </p>
        </li>
      ))}
    </ol>
  )
}
