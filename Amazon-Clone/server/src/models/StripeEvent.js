import mongoose, { Schema } from 'mongoose'
import { STRIPE_EVENT_STATUSES, STRIPE_EVENT_TTL_DAYS } from '../utils/constants.js'

const stripeEventSchema = new Schema(
  {
    eventId: { type: String, required: true, match: /^evt_/ },
    type: { type: String, required: true },
    objectId: { type: String, default: null },
    livemode: { type: Boolean, default: false },
    status: { type: String, enum: STRIPE_EVENT_STATUSES, default: 'received' },
    error: { type: String, default: null },
    attempts: { type: Number, min: 1, default: 1 },
    receivedAt: { type: Date, required: true, default: Date.now },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

stripeEventSchema.index({ eventId: 1 }, { unique: true })
stripeEventSchema.index(
  { receivedAt: 1 },
  { expireAfterSeconds: STRIPE_EVENT_TTL_DAYS * 24 * 60 * 60 },
)
stripeEventSchema.index(
  { status: 1, receivedAt: -1 },
  { partialFilterExpression: { status: 'failed' } },
)

export const StripeEvent = mongoose.model('StripeEvent', stripeEventSchema)
