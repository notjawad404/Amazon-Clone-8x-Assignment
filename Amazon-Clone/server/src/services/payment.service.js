import { stripe } from '../config/stripe.js'
import { Order, Payment } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { AUTOMATIC_PAYMENT_METHODS } from '../utils/constants.js'
import { logger } from '../utils/logger.js'

const NOT_CANCELLABLE = ['succeeded', 'canceled', 'processing']

function paymentUnavailable(order, error) {
  logger.error(`Stripe PaymentIntent failed for order ${order.orderNumber}: ${error.message}`)
  return new ApiError(502, 'We couldn’t reach our payment provider. Please try again.', {
    code: 'payment_unavailable',
    details: { orderNumber: order.orderNumber },
  })
}

async function insertPayment(order, paymentIntent) {
  try {
    return await Payment.create({
      order: order._id,
      user: order.user,
      stripePaymentIntentId: paymentIntent.id,
      amountCents: order.totalCents,
      currency: order.currency,
    })
  } catch (error) {
    if (error?.code !== 11000) throw error
    return Payment.findOne({ order: order._id })
  }
}

/**
 * Returns the order's one PaymentIntent, creating it on first use. The idempotency key and the
 * unique `payments.order` index mean repeated or concurrent calls never create a second one.
 * The client_secret is fetched from Stripe each time and never stored.
 */
export async function ensurePaymentIntent(order) {
  try {
    const existing = await Payment.findOne({ order: order._id }).lean()
    if (existing) {
      const paymentIntent = await stripe.paymentIntents.retrieve(existing.stripePaymentIntentId)
      return { clientSecret: paymentIntent.client_secret, status: paymentIntent.status }
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: order.totalCents,
        currency: order.currency,
        automatic_payment_methods: AUTOMATIC_PAYMENT_METHODS,
        metadata: {
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          userId: String(order.user),
        },
      },
      { idempotencyKey: `pi-${order._id}` },
    )
    const payment = await insertPayment(order, paymentIntent)
    await Order.updateOne({ _id: order._id, payment: null }, { $set: { payment: payment._id } })
    return { clientSecret: paymentIntent.client_secret, status: paymentIntent.status }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw paymentUnavailable(order, error)
  }
}

// Returns the PaymentIntent's final status; a succeeded or processing one is left alone.
export async function cancelPaymentIntent(paymentIntentId) {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
  if (NOT_CANCELLABLE.includes(paymentIntent.status)) return paymentIntent.status
  const canceled = await stripe.paymentIntents.cancel(paymentIntentId)
  return canceled.status
}

export function refundOrder(order, paymentIntentId) {
  return stripe.refunds.create(
    { payment_intent: paymentIntentId },
    { idempotencyKey: `refund-${order._id}` },
  )
}
