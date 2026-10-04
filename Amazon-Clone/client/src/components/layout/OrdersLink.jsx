import { Link } from 'react-router-dom'
import { NAV_ITEM } from './navStyles'

export default function OrdersLink() {
  return (
    <Link to="/orders" className={`${NAV_ITEM} hidden shrink-0 leading-tight md:block`}>
      <span className="block text-xs">Returns</span>
      <span className="block text-sm font-bold">& Orders</span>
    </Link>
  )
}
