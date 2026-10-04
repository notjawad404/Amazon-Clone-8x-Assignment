import { Link } from 'react-router-dom'
import Icon from '../ui/Icon'
import { SIDEBAR_HEADING, SIDEBAR_ITEM } from './navStyles'

export default function SidebarDepartmentPanel({ department, onBack, backButtonRef }) {
  return (
    <nav aria-label={department ? department.name : 'Department'} className="pb-6">
      <button
        ref={backButtonRef}
        type="button"
        onClick={onBack}
        className={`${SIDEBAR_ITEM} justify-start gap-3 border-b border-gray-300 font-bold`}
      >
        <Icon name="chevron-left" className="size-4" />
        Main menu
      </button>
      {department && (
        <>
          <h2 className={SIDEBAR_HEADING}>{department.name}</h2>
          <ul>
            <li>
              <Link to={`/c/${department.slug}`} className={SIDEBAR_ITEM}>
                See all {department.name}
              </Link>
            </li>
            {department.children.map((category) => (
              <li key={category._id}>
                <Link to={`/c/${category.slug}`} className={SIDEBAR_ITEM}>
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </nav>
  )
}
