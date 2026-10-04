import mongoose, { Schema } from 'mongoose'
import { MAX_CART_ITEMS, MAX_CART_QTY } from '../utils/constants.js'
import { integer } from './shared.js'

const cartItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: Schema.Types.ObjectId, required: true },
  qty: { type: Number, required: true, min: 1, max: MAX_CART_QTY, validate: integer },
  savedForLater: { type: Boolean, default: false },
  addedPriceCents: { type: Number, required: true, min: 0, validate: integer },
  addedAt: { type: Date, default: Date.now },
})

function hasUniqueVariants(items) {
  const keys = items.map((item) => `${item.product}:${item.variantId}`)
  return new Set(keys).size === keys.length
}

const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [cartItemSchema],
      validate: [
        {
          validator: (items) => items.length <= MAX_CART_ITEMS,
          message: `A cart can hold at most ${MAX_CART_ITEMS} items`,
        },
        { validator: hasUniqueVariants, message: 'Each variant can appear only once in a cart' },
      ],
    },
  },
  { timestamps: true, optimisticConcurrency: true },
)

cartSchema.index({ user: 1 }, { unique: true })

export const Cart = mongoose.model('Cart', cartSchema)
