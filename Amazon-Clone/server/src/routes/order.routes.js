import { Router } from 'express'
import * as orderController from '../controllers/order.controller.js'
import { protect } from '../middleware/protect.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { orderParamsSchema } from '../validators/order.schema.js'

const router = Router()

router.use(protect)
router.post(
  '/:orderNumber/payment-intent',
  validate({ params: orderParamsSchema }),
  asyncHandler(orderController.getPaymentIntent),
)

export default router
