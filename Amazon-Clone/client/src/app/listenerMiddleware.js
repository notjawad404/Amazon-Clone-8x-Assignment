import { createListenerMiddleware } from '@reduxjs/toolkit'
import { apiSlice } from '../features/api/apiSlice'
import { authApi } from '../features/auth/authApi'

export const listenerMiddleware = createListenerMiddleware()

listenerMiddleware.startListening({
  matcher: authApi.endpoints.signOut.matchFulfilled,
  effect: (_action, { dispatch }) => {
    dispatch(apiSlice.util.resetApiState())
  },
})
