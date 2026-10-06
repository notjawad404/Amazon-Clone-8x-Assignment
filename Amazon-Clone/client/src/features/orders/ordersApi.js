import { apiSlice } from '../api/apiSlice'
import { cartApi } from '../cart/cartApi'

export const ordersApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getOrders: build.query({
      query: (params) => ({ url: '/orders', params }),
      providesTags: ['Orders'],
    }),
    getOrder: build.query({
      query: (orderNumber) => `/orders/${orderNumber}`,
      providesTags: (_result, _error, orderNumber) => [{ type: 'Order', id: orderNumber }],
    }),
    cancelOrder: build.mutation({
      query: (orderNumber) => ({ url: `/orders/${orderNumber}/cancel`, method: 'POST' }),
      invalidatesTags: ['Orders'],
      async onQueryStarted(orderNumber, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(ordersApi.util.upsertQueryData('getOrder', orderNumber, data))
        } catch {
          // The failed request is already reported through the mutation result.
        }
      },
    }),
    buyAgain: build.mutation({
      query: (orderNumber) => ({ url: `/orders/${orderNumber}/buy-again`, method: 'POST' }),
      async onQueryStarted(_orderNumber, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(cartApi.util.upsertQueryData('getCart', undefined, data.cart))
        } catch {
          // The failed request is already reported through the mutation result.
        }
      },
    }),
  }),
})

export const { useGetOrdersQuery, useGetOrderQuery, useCancelOrderMutation, useBuyAgainMutation } =
  ordersApi
