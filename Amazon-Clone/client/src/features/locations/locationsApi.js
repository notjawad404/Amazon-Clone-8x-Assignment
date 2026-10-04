import { LOCATIONS_CACHE_SECONDS } from '../../utils/constants'
import { apiSlice } from '../api/apiSlice'

export const locationsApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getCountries: build.query({
      query: () => '/locations/countries',
      keepUnusedDataFor: LOCATIONS_CACHE_SECONDS,
    }),
    getStates: build.query({
      query: (countryCode) => `/locations/countries/${countryCode}/states`,
      keepUnusedDataFor: LOCATIONS_CACHE_SECONDS,
    }),
    getCities: build.query({
      query: ({ country, state }) => ({ url: '/locations/cities', params: { country, state } }),
      keepUnusedDataFor: LOCATIONS_CACHE_SECONDS,
    }),
  }),
})

export const { useGetCountriesQuery, useGetStatesQuery, useGetCitiesQuery } = locationsApi
