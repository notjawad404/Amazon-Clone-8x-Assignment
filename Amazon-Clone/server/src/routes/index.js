import { Router } from 'express'
import authRoutes from './auth.routes.js'
import cartRoutes from './cart.routes.js'
import categoryRoutes from './category.routes.js'
import healthRoutes from './health.routes.js'
import productRoutes from './product.routes.js'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/categories', categoryRoutes)
router.use('/products', productRoutes)
router.use('/cart', cartRoutes)

export default router
