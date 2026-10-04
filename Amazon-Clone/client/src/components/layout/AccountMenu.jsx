import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useSignOut } from '../../hooks/useSignOut'
import { authPath } from '../../utils/redirect'
import { buttonClasses } from '../ui/buttonStyles'
import Icon from '../ui/Icon'
import { NAV_ITEM } from './navStyles'

const MENU_LINK = 'block rounded-sm py-1 text-sm hover:text-link-hover hover:underline'

function GuestMenu({ signInPath, signUpPath, onNavigate }) {
  return (
    <div className="text-center">
      <Link
        to={signInPath}
        onClick={onNavigate}
        className={buttonClasses('yellow', 'w-full rounded-lg')}
      >
        Sign in
      </Link>
      <p className="mt-2 text-xs">
        New customer?{' '}
        <Link
          to={signUpPath}
          onClick={onNavigate}
          className="text-link hover:text-link-hover hover:underline"
        >
          Start here.
        </Link>
      </p>
    </div>
  )
}

function SignedInMenu({ onNavigate }) {
  const { signOut, isSigningOut } = useSignOut()

  return (
    <>
      <h2 className="mb-1 text-base font-bold">Your Account</h2>
      <Link to="/account" onClick={onNavigate} className={MENU_LINK}>
        Your Account
      </Link>
      <Link to="/orders" onClick={onNavigate} className={MENU_LINK}>
        Your Orders
      </Link>
      <button
        type="button"
        onClick={signOut}
        disabled={isSigningOut}
        className={`${MENU_LINK} w-full cursor-pointer text-left disabled:opacity-60`}
      >
        Sign out
      </button>
    </>
  )
}

export default function AccountMenu() {
  const { firstName, isAuthenticated } = useAuth()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const isClosingRef = useRef(false)

  const currentPath = location.pathname + location.search
  const signInPath = authPath('/signin', currentPath)
  const close = () => setIsOpen(false)

  function handleFocus() {
    if (!isClosingRef.current) setIsOpen(true)
  }

  function handleBlur(event) {
    if (!containerRef.current.contains(event.relatedTarget)) close()
  }

  useEffect(() => {
    if (!isOpen) return undefined
    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      if (containerRef.current.contains(document.activeElement)) {
        isClosingRef.current = true
        triggerRef.current.focus()
        isClosingRef.current = false
      }
      setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={close}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className="relative shrink-0"
    >
      <Link
        ref={triggerRef}
        to={isAuthenticated ? '/account' : signInPath}
        onClick={close}
        className={`${NAV_ITEM} block leading-tight`}
      >
        <span className="flex items-center gap-1 text-sm md:hidden">
          {firstName ?? 'Sign in'}
          <Icon name="chevron-right" className="size-3" />
          <Icon name="user" className="size-6" />
        </span>
        <span className="hidden md:block">
          <span className="block text-xs">Hello, {firstName ?? 'sign in'}</span>
          <span className="flex items-center gap-0.5 text-sm font-bold">
            Account & Lists
            <Icon name="chevron-down" className="size-3 text-gray-400" />
          </span>
        </span>
      </Link>

      {isOpen && (
        <div className="absolute top-full right-0 z-40 hidden pt-1 md:block">
          <div className="w-60 rounded-sm bg-white p-4 text-ink shadow-lg ring-1 ring-black/10">
            {isAuthenticated ? (
              <SignedInMenu onNavigate={close} />
            ) : (
              <GuestMenu
                signInPath={signInPath}
                signUpPath={authPath('/signup', currentPath)}
                onNavigate={close}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
