import { asyncHandler } from '../utils/asyncHandler.js'
import { loadUserFromCookie } from './protect.js'

export const optionalAuth = asyncHandler(async (req, res, next) => {
  req.user = (await loadUserFromCookie(req, res)) ?? null
  next()
})
