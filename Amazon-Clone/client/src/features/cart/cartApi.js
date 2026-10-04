import { apiSlice } from '../api/apiSlice'

// Every cart write returns the full hydrated cart, so it replaces the cached copy directly.
async function cacheReturnedCart(_arg, { dispatch, queryFulfilled }) {
  try {
    const { data } = await queryFulfilled
    dispatch(cartApi.util.upsertQueryData('getCart', undefined, data))
  } catch {
    // The failed request is already reported through the mutation result.
  }
}

export const cartApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getCart: build.query({
      query: () => '/cart',
      providesTags: ['Cart'],
    }),
    previewCart: build.query({
      query: (items) => ({ url: '/cart/preview', method: 'POST', body: { items } }),
    }),
    addCartItem: build.mutation({
      query: (item) => ({ url: '/cart/items', method: 'POST', body: item }),
      onQueryStarted: cacheReturnedCart,
    }),
    updateCartItem: build.mutation({
      query: ({ itemId, ...changes }) => ({
        url: `/cart/items/${itemId}`,
        method: 'PATCH',
        body: changes,
      }),
      onQueryStarted: cacheReturnedCart,
    }),
    removeCartItem: build.mutation({
      query: (itemId) => ({ url: `/cart/items/${itemId}`, method: 'DELETE' }),
      onQueryStarted: cacheReturnedCart,
    }),
    mergeCart: build.mutation({
      query: (items) => ({ url: '/cart/merge', method: 'POST', body: { items } }),
      onQueryStarted: cacheReturnedCart,
    }),
  }),
})

export const {
  useGetCartQuery,
  usePreviewCartQuery,
  useLazyPreviewCartQuery,
  useAddCartItemMutation,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
} = cartApi
