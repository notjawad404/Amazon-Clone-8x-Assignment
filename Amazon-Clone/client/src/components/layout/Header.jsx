import { useDispatch } from 'react-redux'
import { openSidebar } from '../../features/ui/uiSlice'
import Icon from '../ui/Icon'
import AccountMenu from './AccountMenu'
import CartIcon from './CartIcon'
import DeliverTo from './DeliverTo'
import NavLogo from './NavLogo'
import { NAV_ITEM } from './navStyles'
import OrdersLink from './OrdersLink'
import SearchBar from './SearchBar'
import SubNav from './SubNav'

export default function Header() {
  const dispatch = useDispatch()

  return (
    <header className="bg-nav text-white">
      <div className="flex flex-wrap items-center gap-x-1 px-2 pt-1 md:h-15 md:flex-nowrap md:gap-x-2 md:pt-0">
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
        <SearchBar />
        <div className="h-13 flex-1 md:hidden" />
        <AccountMenu />
        <OrdersLink />
        <CartIcon />
      </div>
      <DeliverTo variant="strip" />
      <SubNav />
    </header>
  )
}
