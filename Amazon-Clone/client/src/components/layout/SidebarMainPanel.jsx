import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useSignOut } from '../../hooks/useSignOut'
import { authPath } from '../../utils/redirect'
import Icon from '../ui/Icon'
import Skeleton from '../ui/Skeleton'
import { SIDEBAR_HEADING, SIDEBAR_ITEM } from './navStyles'

const SKELETON_KEYS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6']

function DepartmentList({ departments, isLoading, isError, onRetry, onSelectDepartment }) {
  if (isLoading) {
    return (
      <div className="space-y-4 px-8 py-3" aria-hidden="true">
        {SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-4 w-3/4" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div role="alert" className="px-8 py-3 text-sm">
        <p>We couldn&apos;t load the departments.</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 cursor-pointer text-link hover:text-link-hover hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <ul>
      {departments.map((department) => (
        <li key={department._id}>
          <button
            type="button"
            data-department-id={department._id}
            onClick={() => onSelectDepartment(department._id)}
            className={SIDEBAR_ITEM}
          >
            {department.name}
            <Icon name="chevron-right" className="size-4 text-gray-500" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function HelpAndSettings() {
  const { isAuthenticated } = useAuth()
  const { signOut, isSigningOut } = useSignOut()
  const location = useLocation()

  return (
    <ul>
      <li>
        <Link to="/account" className={SIDEBAR_ITEM}>
          Your Account
        </Link>
      </li>
      <li>
        <Link to="/orders" className={SIDEBAR_ITEM}>
          Returns & Orders
        </Link>
      </li>
      <li>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={signOut}
            disabled={isSigningOut}
            className={`${SIDEBAR_ITEM} disabled:opacity-60`}
          >
            Sign out
          </button>
        ) : (
          <Link
            to={authPath('/signin', location.pathname + location.search)}
            className={SIDEBAR_ITEM}
          >
            Sign in
          </Link>
        )}
      </li>
    </ul>
  )
}

export default function SidebarMainPanel(props) {
  return (
    <nav aria-label="Main menu" className="pb-6">
      <h2 className={SIDEBAR_HEADING}>Shop by Department</h2>
      <DepartmentList {...props} />
      <hr className="my-2 border-gray-300" />
      <h2 className={SIDEBAR_HEADING}>Help & Settings</h2>
      <HelpAndSettings />
    </nav>
  )
}
