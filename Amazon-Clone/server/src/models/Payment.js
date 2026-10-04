import mongoose, { Schema } from 'mongoose'
import { CURRENCY, PAYMENT_STATUSES } from '../utils/constants.js'
import { integer } from './shared.js'

const refundSchema = new Schema(
  {
    stripeRefundId: { type: String, required: true },
    amountCents: { type: Number, required: true, min: 0, validate: integer },
    status: { type: String, required: true },
    reason: { type: String, default: null },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
)

const lastErrorSchema = new Schema(
  {
    code: { type: String, default: null },
    declineCode: { type: String, default: null },
    message: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { _id: false },
)

const cardSchema = new Schema(
  {
    brand: String,
    last4: String,
    expMonth: Number,
    expYear: Number,
    country: String,
  },
  { _id: false },
)

const paymentSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, default: 'stripe' },
    stripePaymentIntentId: { type: String, required: true, match: /^pi_/ },
    amountCents: { type: Number, required: true, min: 0, validate: integer },
    currency: { type: String, required: true, default: CURRENCY },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'requires_payment_method' },
    failedAttempts: { type: Number, min: 0, default: 0 },
    lastError: { type: lastErrorSchema, default: null },
    card: { type: cardSchema, default: null },
    stripeChargeId: { type: String, default: null },
    receiptUrl: { type: String, default: null },
    amountRefundedCents: { type: Number, min: 0, default: 0, validate: integer },
    refunds: [refundSchema],
    succeededAt: { type: Date, default: null },
    canceledAt: { type: Date, default: null },
    lastEventId: { type: String, default: null },
  },
  { timestamps: true },
)

paymentSchema.index({ stripePaymentIntentId: 1 }, { unique: true })
paymentSchema.index({ order: 1 }, { unique: true })
paymentSchema.index({ user: 1, createdAt: -1 })

export const Payment = mongoose.model('Payment', paymentSchema)
