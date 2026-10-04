import { MemoryStore, rateLimit } from 'express-rate-limit'
import { ApiError } from '../utils/ApiError.js'

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

function limiter({ limit, message, store }) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    limit,
    store,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res, next) => next(new ApiError(429, message, { code: 'rate_limited' })),
  })
}

export const authLimiterStore = new MemoryStore()

export const authLimiter = limiter({
  limit: 10,
  message: 'Too many attempts. Please wait 15 minutes and try again.',
  store: authLimiterStore,
})

export const apiLimiter = limiter({
  limit: 1000,
  message: 'Too many requests. Please slow down and try again shortly.',
})
