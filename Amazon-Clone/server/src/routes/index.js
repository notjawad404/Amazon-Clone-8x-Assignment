import { Router } from 'express'
import addressRoutes from './address.routes.js'
import authRoutes from './auth.routes.js'
import cartRoutes from './cart.routes.js'
import categoryRoutes from './category.routes.js'
import checkoutRoutes from './checkout.routes.js'
import healthRoutes from './health.routes.js'
import locationRoutes from './location.routes.js'
import orderRoutes from './order.routes.js'
import productRoutes from './product.routes.js'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/categories', categoryRoutes)
router.use('/locations', locationRoutes)
router.use('/products', productRoutes)
router.use('/cart', cartRoutes)
router.use('/checkout', checkoutRoutes)
router.use('/orders', orderRoutes)
router.use('/users/me/addresses', addressRoutes)

export default router
