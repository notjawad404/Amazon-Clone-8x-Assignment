import { apiSlice } from '../api/apiSlice'

async function cacheSignedInUser(_arg, { dispatch, queryFulfilled }) {
  try {
    const { data } = await queryFulfilled
    dispatch(authApi.util.upsertQueryData('getMe', undefined, data))
  } catch {
    // The failed request is already reported through the mutation result.
  }
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
    signIn: build.mutation({
      query: (credentials) => ({ url: '/auth/signin', method: 'POST', body: credentials }),
      onQueryStarted: cacheSignedInUser,
    }),
    signUp: build.mutation({
      query: (account) => ({ url: '/auth/signup', method: 'POST', body: account }),
      onQueryStarted: cacheSignedInUser,
    }),
    signOut: build.mutation({
      query: () => ({ url: '/auth/signout', method: 'POST' }),
    }),
  }),
})

export const { useGetMeQuery, useSignInMutation, useSignUpMutation, useSignOutMutation } = authApi
