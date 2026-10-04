import { apiSlice } from '../api/apiSlice'

export const addressesApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getAddresses: build.query({
      query: () => '/users/me/addresses',
      providesTags: ['Addresses'],
    }),
    createAddress: build.mutation({
      query: (address) => ({ url: '/users/me/addresses', method: 'POST', body: address }),
      invalidatesTags: ['Addresses', 'Me'],
    }),
  }),
})

export const { useGetAddressesQuery, useCreateAddressMutation } = addressesApi
