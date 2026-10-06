import { Router } from 'express'
import * as orderController from '../controllers/order.controller.js'
import { protect } from '../middleware/protect.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { listOrdersQuerySchema, orderParamsSchema } from '../validators/order.schema.js'

const router = Router()

router.use(protect)
router.get(
  '/',
  validate({ query: listOrdersQuerySchema }),
  asyncHandler(orderController.listOrders),
)
router.get(
  '/:orderNumber',
  validate({ params: orderParamsSchema }),
  asyncHandler(orderController.getOrder),
)
router.post(
  '/:orderNumber/cancel',
  validate({ params: orderParamsSchema }),
  asyncHandler(orderController.cancelOrder),
)
router.post(
  '/:orderNumber/buy-again',
  validate({ params: orderParamsSchema }),
  asyncHandler(orderController.buyAgain),
)
router.post(
  '/:orderNumber/payment-intent',
  validate({ params: orderParamsSchema }),
  asyncHandler(orderController.getPaymentIntent),
)

export default router
