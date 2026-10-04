import { Link } from 'react-router-dom'
import { buttonClasses } from '../components/ui/buttonStyles'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function CartPage() {
  useDocumentTitle('Shopping Cart')

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-[28px] font-normal">Shopping Cart</h1>
      <p className="mt-2 text-sm text-gray-600">Cart items arrive in a later phase.</p>
      <Link to="/checkout" className={buttonClasses('yellow', 'mt-6 px-8')}>
        Proceed to checkout
      </Link>
    </section>
  )
}
