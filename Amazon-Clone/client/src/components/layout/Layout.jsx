import { Outlet, useMatches } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import CategorySidebar from './CategorySidebar'
import CheckoutHeader from './CheckoutHeader'
import Footer from './Footer'
import Header from './Header'

const MAIN_ID = 'main'

function SkipLink() {
  function handleClick(event) {
    event.preventDefault()
    document.getElementById(MAIN_ID)?.focus()
  }

  return (
    <a
      href={`#${MAIN_ID}`}
      onClick={handleClick}
      className="sr-only rounded-sm bg-white px-4 py-2 text-sm font-bold text-ink shadow-lg focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:ring-3 focus:ring-focus/60 focus:outline-none"
    >
      Skip to main content
    </a>
  )
}

function Main({ className = '', children = <Outlet /> }) {
  return (
    <main id={MAIN_ID} tabIndex={-1} className={`flex-1 focus:outline-none ${className}`}>
      {children}
    </main>
  )
}

function useLayoutVariant() {
  const matches = useMatches()
  return matches.findLast((match) => match.handle?.layout)?.handle.layout ?? 'full'
}

export default function Layout() {
  const variant = useLayoutVariant()

  if (variant === 'minimal') {
    return (
      <>
        <SkipLink />
        <AuthLayout>
          <Main className="flex justify-center px-4">
            <div className="w-full max-w-md">
              <Outlet />
            </div>
          </Main>
        </AuthLayout>
      </>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      {variant === 'checkout' ? <CheckoutHeader /> : <Header />}
      <Main />
      {variant === 'full' && (
        <>
          <Footer />
          <CategorySidebar />
        </>
      )}
    </div>
  )
}
