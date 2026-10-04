import { useCart } from '../../hooks/useCart'
import { useLineAction } from '../../hooks/useLineAction'
import { formatCents } from '../../utils/money'
import Price from '../ui/Price'
import CartLineDetails from './CartLineDetails'
import { CART_ACTION } from './cartStyles'
import QtyStepper from './QtyStepper'

function LinePrice({ line, isUpdating }) {
  return (
    <div
      aria-busy={isUpdating}
      className={`shrink-0 text-right transition-opacity ${isUpdating ? 'opacity-50' : ''}`}
    >
      <Price
        priceCents={line.lineTotalCents}
        listPriceCents={line.listLineTotalCents}
        className="flex-col items-end font-bold"
      />
      <p className="mt-1 text-xs whitespace-nowrap text-gray-600">
        {line.qty} × {formatCents(line.priceCents)}
      </p>
    </div>
  )
}

export default function CartItem({ line, isUpdating = false }) {
  const { update, remove } = useCart()
  const { isPending, error, run } = useLineAction()
  const canChangeQty = !line.unavailable && !line.outOfStock
  const price = !line.unavailable && <LinePrice line={line} isUpdating={isUpdating} />

  return (
    <li aria-busy={isPending} className="border-b border-gray-200 py-4">
      <CartLineDetails line={line} price={price}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-2">
          {canChangeQty && (
            <QtyStepper
              qty={line.qty}
              maxQty={line.maxQty}
              disabled={isPending}
              onChange={(qty) => run(() => update(line, { qty }))}
              onDelete={() => run(() => remove(line))}
            />
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => remove(line))}
            className={CART_ACTION}
          >
            Delete
          </button>
          {!line.unavailable && (
            <>
              <span aria-hidden="true" className="h-4 border-l border-gray-300" />
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => update(line, { savedForLater: true }))}
                className={CART_ACTION}
              >
                Save for later
              </button>
            </>
          )}
        </div>
        {canChangeQty && line.qty > line.maxQty && (
          <p className="text-xs text-price">
            Only {line.maxQty} available. Lower the quantity to check out.
          </p>
        )}
        <p role="alert" className="text-xs text-error empty:hidden">
          {error}
        </p>
      </CartLineDetails>
    </li>
  )
}
