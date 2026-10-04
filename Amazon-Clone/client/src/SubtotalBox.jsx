import { Link } from 'react-router-dom'
import { formatCents } from '../../utils/money'
import { buttonClasses } from '../ui/buttonStyles'
import Button from '../ui/Button'
import Icon from '../ui/Icon'

export function SubtotalLine({ cart, className = '' }) {
  const { itemCount, subtotalCents } = cart
  return (
    <p className={`text-lg ${className}`}>
      Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'}):{' '}
      <span className="font-bold">{formatCents(subtotalCents)}</span>
    </p>
  )
}

export default function SubtotalBox({ cart }) {
  const canCheckout = cart.itemCount > 0

  return (
    <section aria-label="Order subtotal" className="space-y-4 bg-white p-5">
      {cart.qualifiesForFreeShipping && (
        <p className="flex gap-2 text-xs text-success">
          <Icon name="check" className="size-5 rounded-full bg-success p-0.5 text-white" />
          <span>
            Your order qualifies for FREE delivery.{' '}
            <span className="text-gray-700">Choose this option at checkout.</span>
          </span>
        </p>
      )}
      {canCheckout && !cart.qualifiesForFreeShipping && (
        <p className="text-xs text-gray-700">
          Add{' '}
          <span className="font-bold text-price">
            {formatCents(cart.freeShippingRemainingCents)}
          </span>{' '}
          of eligible items to your order to qualify for FREE delivery.
        </p>
      )}
      <SubtotalLine cart={cart} />
      {canCheckout ? (
        <Link to="/checkout" className={buttonClasses('yellow', 'w-full')}>
          Proceed to checkout
        </Link>
      ) : (
        <Button disabled className="w-full">
          Proceed to checkout
        </Button>
      )}
    </section>
  )
}
