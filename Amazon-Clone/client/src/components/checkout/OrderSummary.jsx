import { formatCents, formatShipping } from '../../utils/money'
import Button from '../ui/Button'

function Row({ label, value, isTotal = false }) {
  return (
    <div
      className={`flex justify-between gap-4 ${isTotal ? 'text-lg font-bold text-price' : 'text-sm'}`}
    >
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export default function OrderSummary({ quote, itemCount, canPlace, isPlacing, onPlace, children }) {
  return (
    <section
      aria-label="Order summary"
      className="space-y-3 rounded-lg border border-gray-300 bg-white p-4"
    >
      <Button onClick={onPlace} disabled={!canPlace} isLoading={isPlacing} className="w-full">
        Place your order
      </Button>
      <p className="text-center text-xs text-gray-600">
        By placing your order, you agree to the store&apos;s conditions of use.
      </p>
      {children}
      <h2 className="border-t border-gray-200 pt-3 text-lg font-bold">Order Summary</h2>
      <dl className="space-y-1">
        <Row label={`Items (${itemCount}):`} value={formatCents(quote.subtotalCents)} />
        <Row label="Shipping & handling:" value={formatShipping(quote.shippingCents)} />
        <Row
          label="Total before tax:"
          value={formatCents(quote.subtotalCents + quote.shippingCents)}
        />
        <Row label="Estimated tax to be collected:" value={formatCents(quote.taxCents)} />
        <div className="border-t border-gray-200 pt-2">
          <Row label="Order total:" value={formatCents(quote.totalCents)} isTotal />
        </div>
      </dl>
    </section>
  )
}
