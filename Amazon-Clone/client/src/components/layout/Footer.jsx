import { Link } from 'react-router-dom'
import { useGetCategoriesQuery } from '../../features/catalog/catalogApi'
import { APP_NAME } from '../../utils/constants'
import Logo from './Logo'

const ACCOUNT_LINKS = [
  { to: '/account', label: 'Your Account' },
  { to: '/orders', label: 'Your Orders' },
  { to: '/account/addresses', label: 'Your Addresses' },
  { to: '/cart', label: 'Shopping Cart' },
]

const LINK_CLASS =
  'rounded-sm text-gray-300 hover:underline focus-visible:underline focus-visible:outline-none'

function LinkColumn({ title, links }) {
  return (
    <div>
      <h2 className="mb-2 text-base font-bold text-white">{title}</h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className={LINK_CLASS}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function toCategoryLink(category) {
  return { to: `/c/${category.slug}`, label: category.name }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

export default function Footer() {
  const { data: departments = [] } = useGetCategoriesQuery()
  const popularCategories = departments.map((department) => department.children[0]).filter(Boolean)

  return (
    <footer className="mt-auto bg-nav-light text-sm text-white">
      <button
        type="button"
        onClick={scrollToTop}
        className="w-full cursor-pointer bg-nav-mid py-4 text-sm hover:bg-nav-mid/80 focus-visible:underline focus-visible:outline-none"
      >
        Back to top
      </button>

      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-6 gap-y-8 px-6 py-10 md:grid-cols-4">
        <LinkColumn title="Shop by Department" links={departments.map(toCategoryLink)} />
        <LinkColumn title="Popular Categories" links={popularCategories.map(toCategoryLink)} />
        <LinkColumn title="Let Us Help You" links={ACCOUNT_LINKS} />
        <div>
          <h2 className="mb-2 text-base font-bold">About {APP_NAME}</h2>
          <p className="text-gray-300">
            A demo store built for learning. Not affiliated with Amazon.
          </p>
          <p className="mt-2 text-gray-300">
            Payments run in Stripe test mode, so no real charges are made.
          </p>
        </div>
      </div>

      <div className="flex justify-center border-t border-gray-600 py-8">
        <Link
          to="/"
          aria-label={`${APP_NAME} home`}
          className="rounded-sm p-1 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          <Logo />
        </Link>
      </div>

      <p className="bg-nav px-4 py-6 text-center text-xs text-gray-300">
        © {new Date().getFullYear()} {APP_NAME}. A demo store, not affiliated with Amazon.
      </p>
    </footer>
  )
}
