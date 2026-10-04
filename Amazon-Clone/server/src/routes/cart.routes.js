import { Router } from 'express'
import * as cartController from '../controllers/cart.controller.js'
import { protect } from '../middleware/protect.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  addItemSchema,
  guestItemsSchema,
  itemParamsSchema,
  updateItemSchema,
} from '../validators/cart.schema.js'

const router = Router()

router.post(
  '/preview',
  validate({ body: guestItemsSchema }),
  asyncHandler(cartController.previewCart),
)

router.use(protect)
router.get('/', asyncHandler(cartController.getCart))
router.post('/items', validate({ body: addItemSchema }), asyncHandler(cartController.addItem))
router.patch(
  '/items/:itemId',
  validate({ params: itemParamsSchema, body: updateItemSchema }),
  asyncHandler(cartController.updateItem),
)
router.delete(
  '/items/:itemId',
  validate({ params: itemParamsSchema }),
  asyncHandler(cartController.removeItem),
)
router.post('/merge', validate({ body: guestItemsSchema }), asyncHandler(cartController.mergeCart))

export default router
