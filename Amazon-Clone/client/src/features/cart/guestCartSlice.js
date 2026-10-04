import { createSlice } from '@reduxjs/toolkit'
import { GUEST_CART_STORAGE_KEY } from '../../utils/constants'

function isValidItem(item) {
  return (
    typeof item?.productId === 'string' &&
    typeof item.variantId === 'string' &&
    Number.isInteger(item.qty) &&
    item.qty > 0
  )
}

function loadItems() {
  try {
    const items = JSON.parse(localStorage.getItem(GUEST_CART_STORAGE_KEY))?.items
    return Array.isArray(items) ? items.filter(isValidItem) : []
  } catch {
    return []
  }
}

const guestCartSlice = createSlice({
  name: 'guestCart',
  initialState: () => ({ items: loadItems() }),
  reducers: {},
})

export const selectGuestCartItems = (state) => state.guestCart.items

export default guestCartSlice.reducer
