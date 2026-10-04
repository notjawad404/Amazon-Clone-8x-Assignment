import { Link } from 'react-router-dom'
import { formatCents } from '../../utils/money'
import { buttonClasses } from '../ui/buttonStyles'
import Icon from '../ui/Icon'

export default function AddedToCart({ cart }) {
  return (
    <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
      <p className="flex items-center gap-1.5 font-bold text-success">
        <Icon name="check" className="size-5 rounded-full bg-success p-0.5 text-white" />
        Added to Cart
      </p>
      <p>
        Cart subtotal ({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}):{' '}
        <span className="font-bold">{formatCents(cart.subtotalCents)}</span>
      </p>
      <Link to="/cart" className={buttonClasses('outline', 'w-full')}>
        Go to Cart
      </Link>
    </div>
  )
}
