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

const lazyPage = (load) => async () => ({ Component: (await load()).default })

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
          { path: '/p/:slug', lazy: lazyPage(() => import('./pages/ProductPage')) },
          { path: '/cart', element: <CartPage /> },
          {
            element: <ProtectedRoute />,
            children: [
              {
                path: '/checkout',
                handle: { layout: 'checkout' },
                lazy: lazyPage(() => import('./pages/CheckoutPage')),
              },
              {
                path: '/order/:orderNumber/confirmation',
                lazy: lazyPage(() => import('./pages/OrderConfirmationPage')),
              },
              { path: '/account', lazy: lazyPage(() => import('./pages/AccountPage')) },
              {
                path: '/account/addresses',
                lazy: lazyPage(() => import('./pages/AddressesPage')),
              },
              { path: '/orders', lazy: lazyPage(() => import('./pages/OrdersPage')) },
              {
                path: '/orders/:orderNumber',
                lazy: lazyPage(() => import('./pages/OrderDetailPage')),
              },
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
