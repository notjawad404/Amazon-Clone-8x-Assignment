import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: false },
  reducers: {
    openSidebar: (state) => {
      state.sidebarOpen = true
    },
    closeSidebar: (state) => {
      state.sidebarOpen = false
    },
  },
})

export const { openSidebar, closeSidebar } = uiSlice.actions

export const selectSidebarOpen = (state) => state.ui.sidebarOpen

export default uiSlice.reducer
