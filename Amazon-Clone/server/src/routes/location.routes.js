import { Router } from 'express'
import * as locationController from '../controllers/location.controller.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { citiesQuerySchema, statesParamsSchema } from '../validators/location.schema.js'

const router = Router()

router.get('/countries', asyncHandler(locationController.listCountries))
router.get(
  '/countries/:countryCode/states',
  validate({ params: statesParamsSchema }),
  asyncHandler(locationController.listStates),
)
router.get(
  '/cities',
  validate({ query: citiesQuerySchema }),
  asyncHandler(locationController.listCities),
)

export default router
