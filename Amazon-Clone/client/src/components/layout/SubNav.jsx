import { useDispatch } from 'react-redux'
import { NavLink } from 'react-router-dom'
import { useGetCategoriesQuery } from '../../features/catalog/catalogApi'
import { openSidebar } from '../../features/ui/uiSlice'
import Icon from '../ui/Icon'
import { NAV_ITEM } from './navStyles'

export default function SubNav() {
  const dispatch = useDispatch()
  const { data: departments = [] } = useGetCategoriesQuery()

  return (
    <nav aria-label="Departments" className="bg-nav-light text-sm text-white">
      <ul className="flex h-10 [scrollbar-width:none] items-center gap-1 overflow-x-auto px-2 whitespace-nowrap">
        <li className="hidden md:block">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => dispatch(openSidebar())}
            className={`${NAV_ITEM} flex cursor-pointer items-center gap-1 font-bold`}
          >
            <Icon name="menu" />
            All
          </button>
        </li>
        {departments.map((department) => (
          <li key={department._id}>
            <NavLink
              to={`/c/${department.slug}`}
              className={({ isActive }) => `${NAV_ITEM} block ${isActive ? 'font-bold' : ''}`}
            >
              {department.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
