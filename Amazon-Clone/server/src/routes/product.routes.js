import { Router } from 'express'
import * as productController from '../controllers/product.controller.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  emptyQuerySchema,
  productParamsSchema,
  reviewsQuerySchema,
  searchQuerySchema,
  suggestionsQuerySchema,
} from '../validators/product.schema.js'

const router = Router()

router.get(
  '/',
  validate({ query: searchQuerySchema }),
  asyncHandler(productController.searchProducts),
)
router.get('/home', asyncHandler(productController.getHome))
router.get(
  '/suggestions',
  validate({ query: suggestionsQuerySchema }),
  asyncHandler(productController.getSuggestions),
)
router.get(
  '/:slug',
  validate({ params: productParamsSchema, query: emptyQuerySchema }),
  asyncHandler(productController.getProduct),
)
router.get(
  '/:slug/reviews',
  validate({ params: productParamsSchema, query: reviewsQuerySchema }),
  asyncHandler(productController.getReviews),
)
router.get(
  '/:slug/related',
  validate({ params: productParamsSchema, query: emptyQuerySchema }),
  asyncHandler(productController.getRelated),
)

export default router
