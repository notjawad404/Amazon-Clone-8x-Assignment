import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import { apiSlice } from '../features/api/apiSlice'
import { authApi } from '../features/auth/authApi'
import { cartApi } from '../features/cart/cartApi'
import {
  guestCartReplaced,
  guestMergeStatusChanged,
  isGuestCartAction,
  saveItems,
  selectGuestCartItems,
} from '../features/cart/guestCartSlice'
import {
  checkoutFinished,
  isCheckoutAction,
  saveCheckoutState,
  selectCheckoutState,
} from '../features/checkout/checkoutSlice'

export const listenerMiddleware = createListenerMiddleware()

const { getMe, signIn, signUp, signOut } = authApi.endpoints

listenerMiddleware.startListening({
  matcher: signOut.matchFulfilled,
  effect: (_action, { dispatch }) => {
    dispatch(apiSlice.util.resetApiState())
    dispatch(checkoutFinished())
  },
})

listenerMiddleware.startListening({
  predicate: isGuestCartAction,
  effect: (_action, { getState }) => {
    saveItems(selectGuestCartItems(getState()))
  },
})

listenerMiddleware.startListening({
  predicate: isCheckoutAction,
  effect: (_action, { getState }) => {
    saveCheckoutState(selectCheckoutState(getState()))
  },
})

// Sign in also fulfills getMe, so the guest cart is emptied before the request: a second
// trigger then finds nothing to merge. If the merge fails, the guest items are put back.
// Checkout waits on `isMerging` so it never starts from a half-merged cart.
listenerMiddleware.startListening({
  matcher: isAnyOf(getMe.matchFulfilled, signIn.matchFulfilled, signUp.matchFulfilled),
  effect: async (_action, { dispatch, getState }) => {
    const items = selectGuestCartItems(getState())
    if (!items.length) return
    dispatch(guestCartReplaced([]))
    dispatch(guestMergeStatusChanged(true))
    try {
      await dispatch(cartApi.endpoints.mergeCart.initiate(items)).unwrap()
    } catch {
      dispatch(guestCartReplaced(items))
    } finally {
      dispatch(guestMergeStatusChanged(false))
    }
  },
})
