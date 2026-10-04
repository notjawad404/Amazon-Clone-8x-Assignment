import { Router } from 'express'
import * as addressController from '../controllers/address.controller.js'
import { protect } from '../middleware/protect.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  addressParamsSchema,
  createAddressSchema,
  updateAddressSchema,
} from '../validators/address.schema.js'

const router = Router()

router.use(protect)
router.get('/', asyncHandler(addressController.listAddresses))
router.post(
  '/',
  validate({ body: createAddressSchema }),
  asyncHandler(addressController.createAddress),
)
router.patch(
  '/:addressId',
  validate({ params: addressParamsSchema, body: updateAddressSchema }),
  asyncHandler(addressController.updateAddress),
)
router.delete(
  '/:addressId',
  validate({ params: addressParamsSchema }),
  asyncHandler(addressController.deleteAddress),
)
router.post(
  '/:addressId/default',
  validate({ params: addressParamsSchema }),
  asyncHandler(addressController.setDefaultAddress),
)

export default router
