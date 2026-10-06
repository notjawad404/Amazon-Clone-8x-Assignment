import { apiSlice } from '../api/apiSlice'

// Every change can move the default address, which feeds "Deliver to" in the header (Me).
const ADDRESS_TAGS = ['Addresses', 'Me']

export const addressesApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getAddresses: build.query({
      query: () => '/users/me/addresses',
      providesTags: ['Addresses'],
    }),
    createAddress: build.mutation({
      query: (address) => ({ url: '/users/me/addresses', method: 'POST', body: address }),
      invalidatesTags: ADDRESS_TAGS,
    }),
    updateAddress: build.mutation({
      query: ({ addressId, ...changes }) => ({
        url: `/users/me/addresses/${addressId}`,
        method: 'PATCH',
        body: changes,
      }),
      invalidatesTags: ADDRESS_TAGS,
    }),
    deleteAddress: build.mutation({
      query: (addressId) => ({ url: `/users/me/addresses/${addressId}`, method: 'DELETE' }),
      invalidatesTags: ADDRESS_TAGS,
    }),
    setDefaultAddress: build.mutation({
      query: (addressId) => ({ url: `/users/me/addresses/${addressId}/default`, method: 'POST' }),
      invalidatesTags: ADDRESS_TAGS,
    }),
  }),
})

export const {
  useGetAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  useSetDefaultAddressMutation,
} = addressesApi
