import { Link } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'
import { MAX_CART_BADGE_COUNT } from '../../utils/constants'
import Icon from '../ui/Icon'
import { NAV_ITEM } from './navStyles'

export default function CartIcon() {
  const { count } = useCart()
  const badge = count > MAX_CART_BADGE_COUNT ? `${MAX_CART_BADGE_COUNT}+` : count

  return (
    <Link
      to="/cart"
      aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
      className={`${NAV_ITEM} flex shrink-0 items-end`}
    >
      <span className="relative">
        <Icon name="cart" className="size-10" strokeWidth={1.6} />
        <span
          aria-hidden="true"
          className="absolute top-0.5 left-[58%] -translate-x-1/2 text-sm font-bold text-btn-orange"
        >
          {badge}
        </span>
      </span>
      <span aria-hidden="true" className="mb-1 hidden text-sm font-bold md:inline">
        Cart
      </span>
    </Link>
  )
}
