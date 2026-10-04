import mongoose, { Schema } from 'mongoose'
import {
  CHECKOUT_ISSUE_CODES,
  CHECKOUT_SOURCES,
  CHECKOUT_STATUSES,
  CHECKOUT_TTL_HOURS,
  DELIVERY_METHODS,
  MAX_CART_ITEMS,
  MAX_CART_QTY,
} from '../utils/constants.js'
import { addMinutes } from '../utils/dates.js'
import { addressSnapshotSchema, integer } from './shared.js'

const checkoutItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    qty: { type: Number, required: true, min: 1, max: MAX_CART_QTY, validate: integer },
  },
  { _id: false },
)

const cents = { type: Number, required: true, min: 0, validate: integer }

const quoteSchema = new Schema(
  {
    subtotalCents: cents,
    shippingCents: cents,
    taxCents: cents,
    totalCents: cents,
    estimatedDelivery: { type: Date, required: true },
    computedAt: { type: Date, required: true },
  },
  { _id: false },
)

const issueSchema = new Schema(
  {
    variantId: { type: Schema.Types.ObjectId, required: true },
    code: { type: String, enum: CHECKOUT_ISSUE_CODES, required: true },
    message: { type: String, required: true },
  },
  { _id: false },
)

const checkoutSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    source: { type: String, enum: CHECKOUT_SOURCES, required: true },
    items: {
      type: [checkoutItemSchema],
      validate: {
        validator: (items) => items.length >= 1 && items.length <= MAX_CART_ITEMS,
        message: `A checkout needs 1 to ${MAX_CART_ITEMS} items`,
      },
    },
    addressId: { type: Schema.Types.ObjectId, default: null },
    shippingAddress: { type: addressSnapshotSchema, default: null },
    deliveryMethod: { type: String, enum: Object.keys(DELIVERY_METHODS), default: 'standard' },
    quote: { type: quoteSchema, default: null },
    issues: [issueSchema],
    status: { type: String, enum: CHECKOUT_STATUSES, default: 'open' },
    order: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    expiresAt: {
      type: Date,
      required: true,
      default: () => addMinutes(new Date(), CHECKOUT_TTL_HOURS * 60),
    },
  },
  { timestamps: true },
)

checkoutSchema.index({ user: 1, status: 1 })
checkoutSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { status: 'open' } },
)

export const Checkout = mongoose.model('Checkout', checkoutSchema)
