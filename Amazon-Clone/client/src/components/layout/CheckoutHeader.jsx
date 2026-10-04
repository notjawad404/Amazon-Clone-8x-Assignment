import { Link } from 'react-router-dom'
import Icon from '../ui/Icon'
import Logo from './Logo'

export default function CheckoutHeader() {
  return (
    <header className="border-b border-gray-300 bg-linear-to-b from-white to-gray-100">
      <div className="mx-auto flex h-15 max-w-page items-center justify-between gap-4 px-4">
        <Link
          to="/cart"
          aria-label="Return to cart"
          className="rounded-sm px-1 pt-2 focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none"
        >
          <Logo tone="dark" />
        </Link>
        <p className="text-2xl md:text-[28px]">Checkout</p>
        <span className="flex items-center text-gray-500">
          <Icon name="lock" className="size-6" />
          <span className="sr-only">Secure checkout</span>
        </span>
      </div>
    </header>
  )
}
