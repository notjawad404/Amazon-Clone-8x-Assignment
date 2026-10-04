import { useDispatch, useSelector, useStore } from 'react-redux'
import {
  useAddCartItemMutation,
  useGetCartQuery,
  useLazyPreviewCartQuery,
  usePreviewCartQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '../features/cart/cartApi'
import {
  guestItemAdded,
  guestItemRemoved,
  guestItemUpdated,
  selectGuestCartItems,
} from '../features/cart/guestCartSlice'
import { useAuth } from './useAuth'

const EMPTY_CART = {
  items: [],
  count: 0,
  itemCount: 0,
  subtotalCents: 0,
  qualifiesForFreeShipping: false,
  freeShippingRemainingCents: 0,
}

function guestCount(items) {
  return items.filter((item) => !item.savedForLater).reduce((sum, item) => sum + item.qty, 0)
}

/**
 * One interface over the guest cart (localStorage) and the account cart (MongoDB).
 * Cart lines are passed back as returned by the API: `_id` is the item id for the account cart
 * and the variant id for the guest cart.
 */
export function useCart() {
  const dispatch = useDispatch()
  const store = useStore()
  const { isAuthenticated } = useAuth()
  const guestItems = useSelector(selectGuestCartItems)
  const { data: accountCart } = useGetCartQuery(undefined, { skip: !isAuthenticated })
  const [addCartItem] = useAddCartItemMutation()
  const [updateCartItem] = useUpdateCartItemMutation()
  const [removeCartItem] = useRemoveCartItemMutation()
  const [previewCart] = useLazyPreviewCartQuery()

  const count = isAuthenticated ? (accountCart?.count ?? 0) : guestCount(guestItems)

  // Resolves to the updated cart so callers can show the new subtotal.
  async function add({ productId, variantId, qty, maxQty, priceCents }) {
    if (isAuthenticated) return addCartItem({ productId, variantId, qty }).unwrap()
    dispatch(guestItemAdded({ productId, variantId, qty, maxQty, priceCents }))
    return previewCart(selectGuestCartItems(store.getState()), true).unwrap()
  }

  async function update(line, changes) {
    if (isAuthenticated) return updateCartItem({ itemId: line._id, ...changes }).unwrap()
    dispatch(guestItemUpdated({ variantId: line.variantId, ...changes }))
    return null
  }

  async function remove(line) {
    if (isAuthenticated) return removeCartItem(line._id).unwrap()
    dispatch(guestItemRemoved(line.variantId))
    return null
  }

  return { count, isAuthenticated, add, update, remove }
}

export function useCartContents() {
  const { isAuthenticated } = useAuth()
  const guestItems = useSelector(selectGuestCartItems)
  const account = useGetCartQuery(undefined, { skip: !isAuthenticated })
  // Previous guest data stays on screen while an edit is re-priced.
  const guest = usePreviewCartQuery(guestItems, { skip: isAuthenticated || !guestItems.length })

  if (!isAuthenticated && !guestItems.length) {
    return { cart: EMPTY_CART, isError: false, isFetching: false, refetch: () => {} }
  }
  const { data, isError, isFetching, refetch } = isAuthenticated ? account : guest
  return { cart: isError ? null : (data ?? null), isError, isFetching, refetch }
}
