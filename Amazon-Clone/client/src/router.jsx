import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import NotFoundPage from './pages/NotFoundPage'
import PlaceholderPage from './pages/PlaceholderPage'

const PAGES = [
  { path: '/', title: 'Home' },
  { path: '/s', title: 'Search results' },
  { path: '/c/:slug', title: 'Category' },
  { path: '/p/:slug', title: 'Product' },
  { path: '/cart', title: 'Shopping Cart' },
  { path: '/signin', title: 'Sign in' },
  { path: '/signup', title: 'Create account' },
  { path: '/checkout', title: 'Checkout' },
  { path: '/order/:orderNumber/confirmation', title: 'Order confirmation' },
  { path: '/account', title: 'Your Account' },
  { path: '/account/addresses', title: 'Your Addresses' },
  { path: '/orders', title: 'Your Orders' },
  { path: '/orders/:orderNumber', title: 'Order details' },
  { path: '/admin/products', title: 'Admin: Products' },
  { path: '/admin/products/new', title: 'Admin: New product' },
  { path: '/admin/products/:id', title: 'Admin: Edit product' },
  { path: '/admin/categories', title: 'Admin: Categories' },
]

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      ...PAGES.map(({ path, title }) => ({ path, element: <PlaceholderPage title={title} /> })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
