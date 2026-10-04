import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import AuthLayout from './components/layout/AuthLayout'
import Layout from './components/layout/Layout'
import CartPage from './pages/CartPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import PlaceholderPage from './pages/PlaceholderPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import AdminRoute from './routes/AdminRoute'
import GuestOnlyRoute from './routes/GuestOnlyRoute'
import ProtectedRoute from './routes/ProtectedRoute'

const PUBLIC_PAGES = [
  { path: '/s', title: 'Search results' },
  { path: '/c/:slug', title: 'Category' },
  { path: '/p/:slug', title: 'Product' },
]

const PROTECTED_PAGES = [
  { path: '/checkout', title: 'Checkout' },
  { path: '/order/:orderNumber/confirmation', title: 'Order confirmation' },
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

const toPlaceholderRoute = ({ path, title }) => ({
  path,
  element: <PlaceholderPage title={title} />,
})

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <HomePage /> },
          ...PUBLIC_PAGES.map(toPlaceholderRoute),
          { path: '/cart', element: <CartPage /> },
          { element: <ProtectedRoute />, children: PROTECTED_PAGES.map(toPlaceholderRoute) },
          { element: <AdminRoute />, children: ADMIN_PAGES.map(toPlaceholderRoute) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        element: <GuestOnlyRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: '/signin', element: <SignInPage /> },
              { path: '/signup', element: <SignUpPage /> },
            ],
          },
        ],
      },
    ],
  },
])
