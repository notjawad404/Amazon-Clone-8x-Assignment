import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api', credentials: 'include' }),
  tagTypes: [
    'Me',
    'Cart',
    'Checkout',
    'Orders',
    'Order',
    'Addresses',
    'AdminProducts',
    'AdminCategories',
  ],
  endpoints: () => ({}),
})
