import { Link } from 'react-router-dom'
import { formatCents } from '../../utils/money'
import Button from '../ui/Button'
import { buttonClasses } from '../ui/buttonStyles'
import Icon from '../ui/Icon'

export function SubtotalLine({ cart, isUpdating = false, className = '' }) {
  const { itemCount, subtotalCents, listSubtotalCents, savingsCents } = cart
  return (
    <div
      aria-busy={isUpdating}
      className={`transition-opacity ${isUpdating ? 'opacity-50' : ''} ${className}`}
    >
      <p className="text-lg">
        Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'}):{' '}
        <span className="font-bold">{formatCents(subtotalCents)}</span>
      </p>
      {savingsCents > 0 && (
        <p className="text-sm text-gray-700">
          Before discounts: <s>{formatCents(listSubtotalCents)}</s>{' '}
          <span className="font-bold text-deal">You save {formatCents(savingsCents)}</span>
        </p>
      )}
    </div>
  )
}

function FreeShippingNote({ cart }) {
  if (cart.qualifiesForFreeShipping) {
    return (
      <p className="flex gap-2 text-xs text-success">
        <Icon name="check" className="size-5 rounded-full bg-success p-0.5 text-white" />
        <span>
          Your order qualifies for FREE delivery.{' '}
          <span className="text-gray-700">Choose this option at checkout.</span>
        </span>
      </p>
    )
  }
  return (
    <p className="text-xs text-gray-700">
      Add{' '}
      <span className="font-bold text-price">{formatCents(cart.freeShippingRemainingCents)}</span>{' '}
      of eligible items to your order to qualify for FREE delivery.
    </p>
  )
}

export default function SubtotalBox({ cart, isUpdating = false }) {
  const canCheckout = cart.itemCount > 0

  return (
    <section aria-label="Order subtotal" className="space-y-4 bg-white p-5">
      {canCheckout && <FreeShippingNote cart={cart} />}
      <SubtotalLine cart={cart} isUpdating={isUpdating} />
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
