import { Router } from 'express'
import * as categoryController from '../controllers/category.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

router.get('/', asyncHandler(categoryController.listCategories))

export default router
