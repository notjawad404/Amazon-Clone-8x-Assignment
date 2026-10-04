import { createSlice } from '@reduxjs/toolkit'
import { CHECKOUT_STORAGE_KEY } from '../../utils/constants'

const EMPTY = { checkoutId: null, buyNowItem: null }

// sessionStorage keeps the checkout through a reload and the sign-in redirect, but not
// across tabs, so two tabs can't place the same checkout from stale screens.
function loadState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CHECKOUT_STORAGE_KEY))
    return {
      checkoutId: typeof saved?.checkoutId === 'string' ? saved.checkoutId : null,
      buyNowItem: saved?.buyNowItem?.variantId ? saved.buyNowItem : null,
    }
  } catch {
    return EMPTY
  }
}

export function saveCheckoutState(state) {
  try {
    if (state.checkoutId || state.buyNowItem) {
      sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(state))
    } else {
      sessionStorage.removeItem(CHECKOUT_STORAGE_KEY)
    }
  } catch {
    // Without storage, a reload starts a fresh checkout.
  }
}

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: loadState,
  reducers: {
    cartCheckoutRequested: () => EMPTY,
    buyNowStarted: (_state, { payload: { productId, variantId, qty } }) => ({
      checkoutId: null,
      buyNowItem: { productId, variantId, qty },
    }),
    checkoutStarted: (_state, { payload: checkoutId }) => ({ checkoutId, buyNowItem: null }),
    checkoutFinished: () => EMPTY,
  },
})

export const { cartCheckoutRequested, buyNowStarted, checkoutStarted, checkoutFinished } =
  checkoutSlice.actions

export const selectCheckoutState = (state) => state.checkout

export const isCheckoutAction = (action) => action.type.startsWith(`${checkoutSlice.name}/`)

export default checkoutSlice.reducer
