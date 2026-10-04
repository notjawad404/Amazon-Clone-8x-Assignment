import { apiSlice } from '../api/apiSlice'

// Writes and starts return the full checkout, so they replace the cached copy directly.
async function cacheReturnedCheckout(_arg, { dispatch, queryFulfilled }) {
  try {
    const { data } = await queryFulfilled
    dispatch(checkoutApi.util.upsertQueryData('getCheckout', data._id, data))
  } catch {
    // The failed request is already reported through the mutation result.
  }
}

export const checkoutApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getCheckout: build.query({
      query: (checkoutId) => `/checkout/${checkoutId}`,
      providesTags: ['Checkout'],
      keepUnusedDataFor: 0,
    }),
    startCheckout: build.mutation({
      query: (body) => ({ url: '/checkout', method: 'POST', body }),
      onQueryStarted: cacheReturnedCheckout,
    }),
    updateCheckout: build.mutation({
      query: ({ checkoutId, ...changes }) => ({
        url: `/checkout/${checkoutId}`,
        method: 'PATCH',
        body: changes,
      }),
      onQueryStarted: cacheReturnedCheckout,
    }),
    placeOrder: build.mutation({
      query: ({ checkoutId, expectedTotalCents }) => ({
        url: `/checkout/${checkoutId}/place`,
        method: 'POST',
        body: { expectedTotalCents },
      }),
    }),
    retryPaymentIntent: build.mutation({
      query: (orderNumber) => ({ url: `/orders/${orderNumber}/payment-intent`, method: 'POST' }),
    }),
  }),
})

export const {
  useGetCheckoutQuery,
  useStartCheckoutMutation,
  useUpdateCheckoutMutation,
  usePlaceOrderMutation,
  useRetryPaymentIntentMutation,
} = checkoutApi
