import { Router } from 'express'
import * as checkoutController from '../controllers/checkout.controller.js'
import { protect } from '../middleware/protect.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  checkoutParamsSchema,
  placeOrderSchema,
  startCheckoutSchema,
  updateCheckoutSchema,
} from '../validators/checkout.schema.js'

const router = Router()

router.use(protect)
router.post(
  '/',
  validate({ body: startCheckoutSchema }),
  asyncHandler(checkoutController.startCheckout),
)
router.get(
  '/:checkoutId',
  validate({ params: checkoutParamsSchema }),
  asyncHandler(checkoutController.getCheckout),
)
router.patch(
  '/:checkoutId',
  validate({ params: checkoutParamsSchema, body: updateCheckoutSchema }),
  asyncHandler(checkoutController.updateCheckout),
)
router.post(
  '/:checkoutId/place',
  validate({ params: checkoutParamsSchema, body: placeOrderSchema }),
  asyncHandler(checkoutController.placeOrder),
)

export default router
