import { Router } from 'express'
import * as productController from '../controllers/product.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get('/home', asyncHandler(productController.getHome))

export default router
