import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'
import { useGetCategoriesQuery } from '../../features/catalog/catalogApi'
import { closeSidebar, selectSidebarOpen } from '../../features/ui/uiSlice'
import { useAuth } from '../../hooks/useAuth'
import { authPath } from '../../utils/redirect'
import Drawer from '../ui/Drawer'
import Icon from '../ui/Icon'
import SidebarDepartmentPanel from './SidebarDepartmentPanel'
import SidebarMainPanel from './SidebarMainPanel'

function SidebarGreeting() {
  const { firstName, isAuthenticated } = useAuth()
  const location = useLocation()
  const content = (
    <>
      <Icon name="user" className="size-7" />
      Hello, {firstName ?? 'sign in'}
    </>
  )
  const className = 'flex items-center gap-3 bg-nav-light px-8 py-3.5 text-lg font-bold text-white'

  if (isAuthenticated) return <p className={className}>{content}</p>
  return (
    <Link
      to={authPath('/signin', location.pathname + location.search)}
      className={`${className} hover:underline focus-visible:underline focus-visible:outline-none`}
    >
      {content}
    </Link>
  )
}

export default function CategorySidebar() {
  const dispatch = useDispatch()
  const isOpen = useSelector(selectSidebarOpen)
  const location = useLocation()
  const { data: departments = [], isLoading, isError, refetch } = useGetCategoriesQuery()
  const [view, setView] = useState({ isDepartment: false, departmentId: null })
  const [wasOpen, setWasOpen] = useState(isOpen)
  const panelsRef = useRef(null)
  const backButtonRef = useRef(null)

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) setView({ isDepartment: false, departmentId: null })
  }

  useEffect(() => {
    dispatch(closeSidebar())
  }, [location.key, dispatch])

  const department = departments.find((candidate) => candidate._id === view.departmentId)

  function showDepartment(departmentId) {
    flushSync(() => setView({ isDepartment: true, departmentId }))
    backButtonRef.current.focus({ preventScroll: true })
  }

  function showMainMenu() {
    flushSync(() => setView((current) => ({ ...current, isDepartment: false })))
    panelsRef.current
      .querySelector(`[data-department-id="${view.departmentId}"]`)
      ?.focus({ preventScroll: true })
  }

  return (
    <Drawer isOpen={isOpen} onClose={() => dispatch(closeSidebar())} label="Shop by department">
      <SidebarGreeting />
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={panelsRef}
          className={`flex h-full w-[200%] transition-transform duration-300 motion-reduce:transition-none ${view.isDepartment ? '-translate-x-1/2' : 'translate-x-0'}`}
        >
          <div className="h-full w-1/2 overflow-y-auto" inert={view.isDepartment}>
            <SidebarMainPanel
              departments={departments}
              isLoading={isLoading}
              isError={isError}
              onRetry={refetch}
              onSelectDepartment={showDepartment}
            />
          </div>
          <div className="h-full w-1/2 overflow-y-auto" inert={!view.isDepartment}>
            <SidebarDepartmentPanel
              department={department}
              onBack={showMainMenu}
              backButtonRef={backButtonRef}
            />
          </div>
        </div>
      </div>
    </Drawer>
  )
}
