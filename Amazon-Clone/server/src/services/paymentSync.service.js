import mongoose from 'mongoose'
import { Order, Payment } from '../models/index.js'
import { PAYMENT_SYNC_LIMIT, SEED_PAYMENT_INTENT_PREFIX } from '../utils/constants.js'
import { logger } from '../utils/logger.js'
import { syncPaymentIntent } from './stripeWebhook.service.js'

const FINAL_PAYMENT_STATUSES = ['succeeded', 'canceled']

/**
 * Asks Stripe about the matching orders that are still waiting for payment, so a payment whose
 * webhook was delayed or lost is still recorded. A Stripe error is logged and the order is shown
 * as it is; the webhook or the next read can settle it.
 */
export async function syncPendingPayments(filter) {
  const orders = await Order.find({ ...filter, status: 'pending_payment' })
    .select('_id')
    .limit(PAYMENT_SYNC_LIMIT)
    .lean()
  if (!orders.length) return

  const payments = await Payment.find({
    order: mongoose.trusted({ $in: orders.map((order) => order._id) }),
    status: mongoose.trusted({ $nin: FINAL_PAYMENT_STATUSES }),
  })
    .select('stripePaymentIntentId')
    .lean()

  await Promise.all(
    payments
      .filter((payment) => !payment.stripePaymentIntentId.startsWith(SEED_PAYMENT_INTENT_PREFIX))
      .map(async ({ stripePaymentIntentId }) => {
        try {
          await syncPaymentIntent(stripePaymentIntentId)
        } catch (error) {
          logger.warn(`Could not check ${stripePaymentIntentId} with Stripe: ${error.message}`)
        }
      }),
  )
}
