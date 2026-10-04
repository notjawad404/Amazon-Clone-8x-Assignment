import { z } from 'zod'
import { CHECKOUT_SOURCES, DELIVERY_METHODS, MAX_CART_QTY } from '../utils/constants.js'
import { objectId } from './common.js'

export const startCheckoutSchema = z
  .strictObject({
    source: z.enum(CHECKOUT_SOURCES),
    item: z
      .strictObject({
        productId: objectId,
        variantId: objectId,
        qty: z.coerce.number().int().min(1).max(MAX_CART_QTY),
      })
      .optional(),
  })
  .refine(({ source, item }) => (source === 'buy_now') === Boolean(item), {
    message: 'Buy Now needs exactly one item; a cart checkout takes none',
    path: ['item'],
  })

export const checkoutParamsSchema = z.strictObject({ checkoutId: objectId })

export const updateCheckoutSchema = z
  .strictObject({
    addressId: objectId.optional(),
    deliveryMethod: z.enum(Object.keys(DELIVERY_METHODS)).optional(),
  })
  .refine((body) => body.addressId || body.deliveryMethod, { message: 'Nothing to update' })

export const placeOrderSchema = z.strictObject({
  expectedTotalCents: z.number().int().min(0),
})
