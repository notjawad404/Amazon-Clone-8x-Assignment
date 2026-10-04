import * as authService from '../services/auth.service.js'
import { clearAuthCookie, setAuthCookie, signToken } from '../utils/token.js'

export async function signUp(req, res) {
  const user = await authService.signUp(req.body)
  setAuthCookie(res, signToken(user._id))
  res.status(201).json(authService.toPublicUser(user))
}

export async function signIn(req, res) {
  const user = await authService.signIn(req.body)
  setAuthCookie(res, signToken(user._id))
  res.json(authService.toPublicUser(user))
}

export function signOut(req, res) {
  clearAuthCookie(res)
  res.status(204).end()
}

export function getMe(req, res) {
  res.json(authService.toPublicUser(req.user))
}
