import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'
import { logger } from '../utils/logger.js'

function toApiError(err) {
  if (err instanceof ApiError) return err
  if (err instanceof ZodError) {
    return new ApiError(400, 'Invalid request', { details: err.issues })
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map(({ path, message }) => ({ path, message }))
    return new ApiError(400, 'Invalid data', { details })
  }
  if (err instanceof mongoose.Error.CastError) {
    return new ApiError(400, `Invalid ${err.path}`)
  }
  if (err?.code === 11000) {
    return new ApiError(409, 'Duplicate value', { code: 'duplicate', details: err.keyValue })
  }
  if (err instanceof jwt.JsonWebTokenError) {
    return new ApiError(401, 'Not signed in')
  }
  // body-parser errors (malformed JSON, payload too large) are safe to expose
  if (err?.expose && err.status < 500) {
    return new ApiError(err.status, err.message)
  }
  return new ApiError(500, 'Something went wrong. Try again.')
}

export function errorHandler(err, req, res, _next) {
  const apiError = toApiError(err)
  if (apiError.status >= 500) logger.error(err)

  const body = { message: apiError.message }
  if (apiError.code) body.code = apiError.code
  if (apiError.details) body.details = apiError.details
  if (env.NODE_ENV === 'development' && apiError.status >= 500) body.stack = err.stack

  res.status(apiError.status).json(body)
}
