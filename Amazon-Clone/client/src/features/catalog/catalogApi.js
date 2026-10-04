import { CATALOG_CACHE_SECONDS } from '../../utils/constants'
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
  }),
})

export const { useGetCategoriesQuery, useGetHomeQuery } = catalogApi
