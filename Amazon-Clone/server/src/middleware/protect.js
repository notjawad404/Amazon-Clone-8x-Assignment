import { findActiveUser } from '../services/auth.service.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AUTH_COOKIE, clearAuthCookie, verifyToken } from '../utils/token.js'

export async function loadUserFromCookie(req, res) {
  const token = req.cookies?.[AUTH_COOKIE]
  if (!token) return null
  try {
    const { sub } = verifyToken(token)
    const user = await findActiveUser(sub)
    if (!user) clearAuthCookie(res)
    return user
  } catch {
    clearAuthCookie(res)
    return null
  }
}

export const protect = asyncHandler(async (req, res, next) => {
  const user = await loadUserFromCookie(req, res)
  if (!user) throw new ApiError(401, 'Please sign in to continue.', { code: 'unauthenticated' })
  req.user = user
  next()
})
