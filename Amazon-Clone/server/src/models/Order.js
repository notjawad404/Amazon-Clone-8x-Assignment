import mongoose, { Schema } from 'mongoose'
import { ApiError } from '../utils/ApiError.js'
import {
  CANCEL_REASONS,
  CHECKOUT_SOURCES,
  CURRENCY,
  DELIVERY_METHODS,
  ORDER_PAYMENT_STATUSES,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
} from '../utils/constants.js'
import { addressSnapshotSchema, integer } from './shared.js'

const cents = { type: Number, required: true, min: 0, validate: integer }

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    variantLabel: { type: String, required: true },
    image: { type: String, default: null },
    sku: { type: String, required: true },
    unitPriceCents: cents,
    qty: { type: Number, required: true, min: 1, validate: integer },
    lineTotalCents: cents,
  },
  { _id: false },
)

const statusHistorySchema = new Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, required: true, default: Date.now },
    note: { type: String, default: null },
  },
  { _id: false },
)

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, match: /^112-\d{7}-\d{7}$/ },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    checkout: { type: Schema.Types.ObjectId, ref: 'Checkout', required: true },
    source: { type: String, enum: CHECKOUT_SOURCES, required: true },
    items: {
      type: [orderItemSchema],
      validate: { validator: (items) => items.length >= 1, message: 'An order needs items' },
    },
    shippingAddress: { type: addressSnapshotSchema, required: true },
    deliveryMethod: { type: String, enum: Object.keys(DELIVERY_METHODS), required: true },
    estimatedDelivery: { type: Date, required: true },
    subtotalCents: cents,
    shippingCents: cents,
    taxCents: cents,
    totalCents: cents,
    currency: { type: String, default: CURRENCY },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending_payment' },
    paymentStatus: { type: String, enum: ORDER_PAYMENT_STATUSES, default: 'unpaid' },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    paymentMethod: {
      type: new Schema({ brand: String, last4: String }, { _id: false }),
      default: null,
    },
    statusHistory: [statusHistorySchema],
    reservationExpiresAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, enum: [...CANCEL_REASONS, null], default: null },
  },
  { timestamps: true },
)

orderSchema.index({ orderNumber: 1 }, { unique: true })
orderSchema.index({ checkout: 1 }, { unique: true })
orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index(
  { status: 1, reservationExpiresAt: 1 },
  { partialFilterExpression: { status: 'pending_payment' } },
)

const TIMESTAMP_FIELDS = {
  paid: 'paidAt',
  shipped: 'shippedAt',
  delivered: 'deliveredAt',
  cancelled: 'cancelledAt',
}

orderSchema.methods.canTransitionTo = function (status) {
  return ORDER_TRANSITIONS[this.status]?.includes(status) ?? false
}

orderSchema.methods.transitionTo = function (
  status,
  { at = new Date(), note = null, cancelReason } = {},
) {
  if (!this.canTransitionTo(status)) {
    throw new ApiError(409, `Order cannot move from ${this.status} to ${status}`, {
      code: 'invalid_status_transition',
    })
  }
  this.status = status
  this[TIMESTAMP_FIELDS[status]] = at
  this.statusHistory.push({ status, at, note })
  if (status !== 'pending_payment') this.reservationExpiresAt = null
  if (status === 'cancelled') this.cancelReason = cancelReason ?? 'user_cancelled'
  return this
}

export const Order = mongoose.model('Order', orderSchema)
