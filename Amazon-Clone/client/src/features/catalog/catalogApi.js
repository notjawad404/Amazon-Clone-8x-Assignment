import { CATALOG_CACHE_SECONDS } from '../../utils/constants'
import { toQueryString } from '../../utils/search'
import { apiSlice } from '../api/apiSlice'

export const catalogApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getCategories: build.query({
      query: () => '/categories',
      keepUnusedDataFor: CATALOG_CACHE_SECONDS,
    }),
    getHome: build.query({
      query: () => '/products/home',
      keepUnusedDataFor: CATALOG_CACHE_SECONDS,
    }),
    searchProducts: build.query({
      query: (params) => `/products?${toQueryString(params)}`,
    }),
    getSuggestions: build.query({
      query: (params) => ({ url: '/products/suggestions', params }),
    }),
  }),
})

export const {
  useGetCategoriesQuery,
  useGetHomeQuery,
  useSearchProductsQuery,
  useGetSuggestionsQuery,
} = catalogApi
