import { formatCents, formatShipping } from '../../utils/money'

function Row({ label, value, isTotal = false }) {
  return (
    <div className={`flex justify-between gap-4 ${isTotal ? 'text-base font-bold' : 'text-sm'}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export default function OrderTotals({ order }) {
  const itemCount = order.items.reduce((sum, item) => sum + item.qty, 0)
  return (
    <dl className="space-y-1">
      <Row label={`Items (${itemCount}):`} value={formatCents(order.subtotalCents)} />
      <Row label="Shipping & handling:" value={formatShipping(order.shippingCents)} />
      <Row
        label="Total before tax:"
        value={formatCents(order.subtotalCents + order.shippingCents)}
      />
      <Row label="Tax:" value={formatCents(order.taxCents)} />
      <div className="border-t border-gray-200 pt-2">
        <Row label="Order total:" value={formatCents(order.totalCents)} isTotal />
      </div>
    </dl>
  )
}
