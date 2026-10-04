import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { protect } from '../middleware/protect.js'
import { authLimiter } from '../middleware/rateLimit.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { signInSchema, signUpSchema } from '../validators/auth.schema.js'

const router = Router()

router.post(
  '/signup',
  authLimiter,
  validate({ body: signUpSchema }),
  asyncHandler(authController.signUp),
)
router.post(
  '/signin',
  authLimiter,
  validate({ body: signInSchema }),
  asyncHandler(authController.signIn),
)
router.post('/signout', authController.signOut)
router.get('/me', protect, authController.getMe)

export default router
