import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export const AUTH_COOKIE = 'token'
const ALGORITHM = 'HS256'

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
}

export function signToken(userId) {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: String(userId),
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: ALGORITHM,
  })
}

export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] })
}

export function setAuthCookie(res, token) {
  const { exp } = jwt.decode(token)
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions, expires: new Date(exp * 1000) })
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, cookieOptions)
}
