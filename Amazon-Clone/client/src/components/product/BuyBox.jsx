import { useState } from 'react'
import { LOW_STOCK_THRESHOLD, MAX_CART_QTY, SELLER_NAME } from '../../utils/constants'
import { formatDeliveryDate } from '../../utils/delivery'
import { formatCents } from '../../utils/money'
import { parseApiError } from '../../utils/apiError'
import AddedToCart from './AddedToCart'
import QtyInput from './QtyInput'
import Button from '../ui/Button'
import Price from '../ui/Price'

function StockMessage({ stock }) {
  if (stock === 0) return <p className="text-lg text-error">Currently unavailable.</p>
  if (stock <= LOW_STOCK_THRESHOLD) {
    return <p className="text-lg text-price">Only {stock} left in stock - order soon.</p>
  }
  return <p className="text-lg text-success">In Stock</p>
}

function DeliveryLine({ delivery }) {
  const date = (
    <span className="font-bold">{formatDeliveryDate(delivery.estimatedDelivery, 'long')}</span>
  )
  if (delivery.shippingCents === 0) return <p className="text-sm">FREE delivery {date}</p>
  return (
    <p className="text-sm">
      <span className="font-bold">{formatCents(delivery.shippingCents)}</span> delivery {date}
    </p>
  )
}

function SellerInfo({ returnPolicy }) {
  const rows = [
    ['Ships from', SELLER_NAME],
    ['Sold by', SELLER_NAME],
    returnPolicy && ['Returns', returnPolicy],
  ].filter(Boolean)

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-gray-600">{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function BuyBox({ variant, returnPolicy = null, onAddToCart, onBuyNow }) {
  const [qty, setQty] = useState(1)
  const [result, setResult] = useState({ status: 'idle', cart: null, error: '' })
  const isAvailable = variant.stock > 0

  async function handleAddToCart() {
    setResult({ status: 'adding', cart: null, error: '' })
    try {
      const cart = await onAddToCart(qty)
      setResult({ status: 'added', cart, error: '' })
    } catch (error) {
      setResult({ status: 'idle', cart: null, error: parseApiError(error).message })
    }
  }

  return (
    <section aria-label="Buy box" className="space-y-3 rounded-lg border border-gray-300 p-4">
      <Price priceCents={variant.priceCents} size="md" />
      {isAvailable && <DeliveryLine delivery={variant.delivery} />}
      <StockMessage stock={variant.stock} />

      {isAvailable && (
        <QtyInput value={qty} max={Math.min(variant.stock, MAX_CART_QTY)} onChange={setQty} />
      )}
      <div className="space-y-2">
        <Button
          onClick={handleAddToCart}
          disabled={!isAvailable}
          isLoading={result.status === 'adding'}
          className="w-full"
        >
          Add to Cart
        </Button>
        <Button
          variant="orange"
          onClick={() => onBuyNow(qty)}
          disabled={!isAvailable}
          className="w-full"
        >
          Buy Now
        </Button>
      </div>
      <div role="status" className="empty:hidden">
        {result.cart && <AddedToCart cart={result.cart} />}
      </div>
      <p role="alert" className="text-sm text-error empty:hidden">
        {result.error}
      </p>
      <SellerInfo returnPolicy={returnPolicy} />
    </section>
  )
}
