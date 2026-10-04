import { ApiError } from '../utils/ApiError.js'

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    throw new ApiError(403, 'You do not have permission to do that.', { code: 'forbidden' })
  }
  next()
}
