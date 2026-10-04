import { createSlice } from '@reduxjs/toolkit'
import { GUEST_CART_STORAGE_KEY, MAX_CART_ITEMS, MAX_CART_QTY } from '../../utils/constants'

function isValidItem(item) {
  return (
    typeof item?.productId === 'string' &&
    typeof item.variantId === 'string' &&
    Number.isInteger(item.qty) &&
    item.qty > 0 &&
    item.qty <= MAX_CART_QTY
  )
}

function loadItems() {
  try {
    const items = JSON.parse(localStorage.getItem(GUEST_CART_STORAGE_KEY))?.items
    if (!Array.isArray(items)) return []
    return items.filter(isValidItem).map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      qty: item.qty,
      savedForLater: item.savedForLater === true,
      addedPriceCents: Number.isInteger(item.addedPriceCents) ? item.addedPriceCents : null,
    }))
  } catch {
    return []
  }
}

export function saveItems(items) {
  try {
    if (items.length) localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify({ items }))
    else localStorage.removeItem(GUEST_CART_STORAGE_KEY)
  } catch {
    // Storage can be full or blocked; the cart still works for this visit.
  }
}

const findItem = (state, variantId) => state.items.find((item) => item.variantId === variantId)

// `maxQty` is the stock seen on the page; the server re-checks stock when the cart is loaded.
const guestCartSlice = createSlice({
  name: 'guestCart',
  initialState: () => ({ items: loadItems(), isMerging: false }),
  reducers: {
    guestItemAdded: (state, { payload }) => {
      const { productId, variantId, qty, maxQty = MAX_CART_QTY, priceCents = null } = payload
      const limit = Math.min(maxQty, MAX_CART_QTY)
      const existing = findItem(state, variantId)
      if (existing) {
        existing.qty = Math.min(existing.qty + qty, limit)
        existing.savedForLater = false
        return
      }
      if (state.items.length >= MAX_CART_ITEMS) return
      state.items.push({
        productId,
        variantId,
        qty: Math.min(qty, limit),
        savedForLater: false,
        addedPriceCents: priceCents,
      })
    },
    guestItemUpdated: (state, { payload: { variantId, qty, savedForLater } }) => {
      const item = findItem(state, variantId)
      if (!item) return
      if (qty !== undefined) item.qty = Math.min(Math.max(qty, 1), MAX_CART_QTY)
      if (savedForLater !== undefined) item.savedForLater = savedForLater
    },
    guestItemRemoved: (state, { payload: variantId }) => {
      state.items = state.items.filter((item) => item.variantId !== variantId)
    },
    guestCartReplaced: (state, { payload: items }) => {
      state.items = items
    },
    guestMergeStatusChanged: (state, { payload: isMerging }) => {
      state.isMerging = isMerging
    },
  },
})

export const {
  guestItemAdded,
  guestItemUpdated,
  guestItemRemoved,
  guestCartReplaced,
  guestMergeStatusChanged,
} = guestCartSlice.actions

export const selectGuestCartItems = (state) => state.guestCart.items
export const selectIsMergingGuestCart = (state) => state.guestCart.isMerging

export const isGuestCartAction = (action) => action.type.startsWith(`${guestCartSlice.name}/`)

export default guestCartSlice.reducer
