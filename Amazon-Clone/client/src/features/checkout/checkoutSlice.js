import { createSlice } from '@reduxjs/toolkit'

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: { checkoutId: null, buyNowItem: null },
  reducers: {
    buyNowStarted: (state, { payload: { productId, variantId, qty } }) => {
      state.buyNowItem = { productId, variantId, qty }
    },
  },
})

export const { buyNowStarted } = checkoutSlice.actions

export const selectBuyNowItem = (state) => state.checkout.buyNowItem

export default checkoutSlice.reducer
