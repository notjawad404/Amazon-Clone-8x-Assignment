import { z } from 'zod'
import { MAX_CART_ITEMS, MAX_CART_QTY } from '../utils/constants.js'
import { objectId } from './common.js'

const qty = z.coerce.number().int().min(1).max(MAX_CART_QTY)

export const addItemSchema = z.strictObject({
  productId: objectId,
  variantId: objectId,
  qty: qty.default(1),
})

export const updateItemSchema = z
  .strictObject({
    qty: qty.optional(),
    savedForLater: z.boolean().optional(),
  })
  .refine(({ qty: value, savedForLater }) => value !== undefined || savedForLater !== undefined, {
    message: 'Nothing to update',
  })

export const itemParamsSchema = z.strictObject({ itemId: objectId })

const guestItem = z.strictObject({
  productId: objectId,
  variantId: objectId,
  qty,
  savedForLater: z.boolean().default(false),
  addedPriceCents: z.number().int().min(0).nullable().default(null),
})

export const guestItemsSchema = z.strictObject({
  items: z.array(guestItem).max(MAX_CART_ITEMS),
})
