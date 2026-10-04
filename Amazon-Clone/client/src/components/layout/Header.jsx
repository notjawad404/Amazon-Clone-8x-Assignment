import { useDispatch } from 'react-redux'
import { openSidebar } from '../../features/ui/uiSlice'
import Icon from '../ui/Icon'
import AccountMenu from './AccountMenu'
import CartIcon from './CartIcon'
import DeliverTo from './DeliverTo'
import NavLogo from './NavLogo'
import { NAV_ITEM } from './navStyles'
import OrdersLink from './OrdersLink'
import SubNav from './SubNav'

export default function Header() {
  const dispatch = useDispatch()

  return (
    <header className="bg-nav text-white">
      <div className="flex h-14 items-center gap-1 px-2 md:h-15 md:gap-2">
        <button
          type="button"
          aria-label="Open menu"
          aria-haspopup="dialog"
          onClick={() => dispatch(openSidebar())}
          className={`${NAV_ITEM} cursor-pointer md:hidden`}
        >
          <Icon name="menu" className="size-7" />
        </button>
        <NavLogo />
        <DeliverTo />
        <div className="flex-1" />
        <AccountMenu />
        <OrdersLink />
        <CartIcon />
      </div>
      <DeliverTo variant="strip" />
      <SubNav />
    </header>
  )
}
