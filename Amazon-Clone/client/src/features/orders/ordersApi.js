import { apiSlice } from '../api/apiSlice'

export const ordersApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getOrder: build.query({
      query: (orderNumber) => `/orders/${orderNumber}`,
      providesTags: (_result, _error, orderNumber) => [{ type: 'Order', id: orderNumber }],
    }),
  }),
})

export const { useGetOrderQuery } = ordersApi
