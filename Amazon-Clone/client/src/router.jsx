import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import Layout from './components/layout/Layout'
import CartPage from './pages/CartPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import PlaceholderPage from './pages/PlaceholderPage'
import SearchPage from './pages/SearchPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import AdminRoute from './routes/AdminRoute'
import GuestOnlyRoute from './routes/GuestOnlyRoute'
import ProtectedRoute from './routes/ProtectedRoute'

const PROTECTED_PAGES = [
  { path: '/account', title: 'Your Account' },
  { path: '/account/addresses', title: 'Your Addresses' },
  { path: '/orders', title: 'Your Orders' },
  { path: '/orders/:orderNumber', title: 'Order details' },
]

const ADMIN_PAGES = [
  { path: '/admin/products', title: 'Admin: Products' },
  { path: '/admin/products/new', title: 'Admin: New product' },
  { path: '/admin/products/:id', title: 'Admin: Edit product' },
  { path: '/admin/categories', title: 'Admin: Categories' },
]

const toPlaceholderRoute = ({ path, title, layout }) => ({
  path,
  element: <PlaceholderPage title={title} />,
  handle: { layout },
})

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/s', element: <SearchPage /> },
          { path: '/c/:slug', element: <SearchPage /> },
          {
            path: '/p/:slug',
            lazy: async () => ({ Component: (await import('./pages/ProductPage')).default }),
          },
          { path: '/cart', element: <CartPage /> },
          {
            element: <ProtectedRoute />,
            children: [
              {
                path: '/checkout',
                handle: { layout: 'checkout' },
                lazy: async () => ({ Component: (await import('./pages/CheckoutPage')).default }),
              },
              {
                path: '/order/:orderNumber/confirmation',
                lazy: async () => ({
                  Component: (await import('./pages/OrderConfirmationPage')).default,
                }),
              },
              ...PROTECTED_PAGES.map(toPlaceholderRoute),
            ],
          },
          { element: <AdminRoute />, children: ADMIN_PAGES.map(toPlaceholderRoute) },
          {
            element: <GuestOnlyRoute />,
            handle: { layout: 'minimal' },
            children: [
              { path: '/signin', element: <SignInPage /> },
              { path: '/signup', element: <SignUpPage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
