import { createSlice, isAnyOf } from '@reduxjs/toolkit'
import { authApi } from './authApi'

const initialState = { user: null, status: 'idle' }

const { getMe, signIn, signUp, signOut } = authApi.endpoints

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(
        isAnyOf(getMe.matchFulfilled, signIn.matchFulfilled, signUp.matchFulfilled),
        (state, { payload }) => {
          state.user = payload
          state.status = 'authenticated'
        },
      )
      .addMatcher(getMe.matchRejected, (state, { meta }) => {
        if (meta.condition || meta.aborted) return
        state.user = null
        state.status = 'guest'
      })
      .addMatcher(signOut.matchFulfilled, (state) => {
        state.user = null
        state.status = 'guest'
      })
  },
})

export const selectCurrentUser = (state) => state.auth.user
export const selectAuthStatus = (state) => state.auth.status

export default authSlice.reducer
