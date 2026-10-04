import { Link } from 'react-router-dom'
import { APP_NAME } from '../../utils/constants'
import Logo from './Logo'
import { NAV_ITEM } from './navStyles'

export default function NavLogo() {
  return (
    <Link to="/" aria-label={`${APP_NAME} home`} className={`${NAV_ITEM} shrink-0 pt-2`}>
      <Logo />
    </Link>
  )
}
