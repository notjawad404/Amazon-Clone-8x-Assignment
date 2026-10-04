import { useCart } from '../../hooks/useCart'
import { useLineAction } from '../../hooks/useLineAction'
import Price from '../ui/Price'
import CartLineDetails from './CartLineDetails'
import { CART_ACTION } from './cartStyles'

export default function SavedItem({ line }) {
  const { update, remove } = useCart()
  const { isPending, error, run } = useLineAction()

  const price = !line.unavailable && (
    <Price priceCents={line.priceCents} className="shrink-0 font-bold" />
  )

  return (
    <li aria-busy={isPending} className="border-b border-gray-200 py-4 last:border-b-0">
      <CartLineDetails line={line} price={price}>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {!line.unavailable && (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => update(line, { savedForLater: false }))}
                className={CART_ACTION}
              >
                Move to cart
              </button>
              <span aria-hidden="true" className="h-4 border-l border-gray-300" />
            </>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => remove(line))}
            className={CART_ACTION}
          >
            Delete
          </button>
        </div>
        <p role="alert" className="text-xs text-error empty:hidden">
          {error}
        </p>
      </CartLineDetails>
    </li>
  )
}
