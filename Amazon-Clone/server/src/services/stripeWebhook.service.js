import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { stripe } from '../config/stripe.js'
import { Order, Payment, StripeEvent } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { logger } from '../utils/logger.js'
import { removePurchasedItems } from './cart.service.js'
import { recordSales, releaseStock } from './inventory.service.js'
import { refundOrder } from './payment.service.js'

const FINAL_PAYMENT_STATUSES = ['succeeded', 'canceled']

export function verifyEvent(rawBody, signature) {
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch {
    throw new ApiError(400, 'Invalid Stripe signature', { code: 'invalid_signature' })
  }
}

async function loadPayment(paymentIntentId, session) {
  const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId }).session(session)
  if (!payment) throw new Error(`No payment for ${paymentIntentId}`)
  const order = await Order.findById(payment.order).session(session)
  return { payment, order }
}

function cardFrom(charge) {
  const card = charge?.payment_method_details?.card
  if (!card) return null
  const { brand, last4, exp_month: expMonth, exp_year: expYear, country } = card
  return { brand, last4, expMonth, expYear, country }
}

async function onSucceeded(paymentIntent, eventId, session) {
  const { payment, order } = await loadPayment(paymentIntent.id, session)
  if (payment.status === 'succeeded') return null

  const charge = paymentIntent.latest_charge
  Object.assign(payment, {
    status: 'succeeded',
    succeededAt: new Date(),
    card: cardFrom(charge),
    stripeChargeId: charge?.id ?? null,
    receiptUrl: charge?.receipt_url ?? null,
    lastEventId: eventId,
  })
  await payment.save({ session })

  const amountMatches =
    paymentIntent.amount_received === order.totalCents && paymentIntent.currency === order.currency
  if (!amountMatches) {
    logger.error(`Payment amount mismatch for order ${order.orderNumber}; not marking it paid`)
    return null
  }
  if (order.status === 'cancelled') return { refund: order }
  if (order.status !== 'pending_payment') return null

  order.transitionTo('paid', { note: 'Payment received' })
  order.paymentStatus = 'paid'
  order.paymentMethod = payment.card
    ? { brand: payment.card.brand, last4: payment.card.last4 }
    : null
  await order.save({ session })
  await recordSales(order.items, session)
  if (order.source === 'cart') {
    const variantIds = order.items.map((item) => item.variantId)
    await removePurchasedItems(order.user, variantIds, session)
  }
  return null
}

async function onFailed(paymentIntent, eventId, session) {
  const { payment } = await loadPayment(paymentIntent.id, session)
  if (FINAL_PAYMENT_STATUSES.includes(payment.status)) return
  const error = paymentIntent.last_payment_error
  payment.status = 'requires_payment_method'
  payment.failedAttempts += 1
  payment.lastError = {
    code: error?.code ?? null,
    declineCode: error?.decline_code ?? null,
    message: error?.message ?? 'Your payment was declined.',
    at: new Date(),
  }
  payment.lastEventId = eventId
  await payment.save({ session })
}

async function onStatus(paymentIntent, eventId, session, status) {
  const { payment } = await loadPayment(paymentIntent.id, session)
  if (FINAL_PAYMENT_STATUSES.includes(payment.status)) return
  payment.status = status
  payment.lastEventId = eventId
  await payment.save({ session })
}

async function onCanceled(paymentIntent, eventId, session) {
  const { payment, order } = await loadPayment(paymentIntent.id, session)
  if (payment.status === 'succeeded') return
  if (payment.status !== 'canceled') {
    Object.assign(payment, { status: 'canceled', canceledAt: new Date(), lastEventId: eventId })
    await payment.save({ session })
  }
  if (order.status !== 'pending_payment') return
  order.transitionTo('cancelled', { cancelReason: 'reservation_expired', note: 'Payment canceled' })
  await order.save({ session })
  await releaseStock(order.items, session)
}

async function onRefunded(charge, eventId, session) {
  const { payment, order } = await loadPayment(charge.payment_intent, session)
  payment.refunds = (charge.refunds?.data ?? []).map((refund) => ({
    stripeRefundId: refund.id,
    amountCents: refund.amount,
    status: refund.status,
    reason: refund.reason ?? null,
    createdAt: new Date(refund.created * 1000),
  }))
  payment.amountRefundedCents = charge.amount_refunded
  payment.lastEventId = eventId
  await payment.save({ session })
  order.paymentStatus = charge.amount_refunded >= charge.amount ? 'refunded' : 'partially_refunded'
  await order.save({ session })
}

// The succeeded handler needs the charge for card details, so it's expanded before the transaction.
async function withCharge(paymentIntent) {
  if (!paymentIntent.latest_charge || typeof paymentIntent.latest_charge === 'object') {
    return paymentIntent
  }
  return stripe.paymentIntents.retrieve(paymentIntent.id, { expand: ['latest_charge'] })
}

const HANDLERS = {
  'payment_intent.succeeded': onSucceeded,
  'payment_intent.payment_failed': onFailed,
  'payment_intent.processing': (pi, id, s) => onStatus(pi, id, s, 'processing'),
  'payment_intent.requires_action': (pi, id, s) => onStatus(pi, id, s, 'requires_action'),
  'payment_intent.canceled': onCanceled,
  'charge.refunded': onRefunded,
}

async function apply(event) {
  let object = event.data.object
  if (event.type === 'payment_intent.succeeded') object = await withCharge(object)

  let followUp = null
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      followUp = await HANDLERS[event.type](object, event.id, session)
    })
  } finally {
    await session.endSession()
  }
  // Paid after the reservation expired: the stock is gone, so give the money back.
  if (followUp?.refund) {
    logger.warn(`Order ${followUp.refund.orderNumber} was paid after it expired; refunding`)
    await refundOrder(followUp.refund, object.id)
  }
}

async function recordEvent(event) {
  try {
    return await StripeEvent.create({
      eventId: event.id,
      type: event.type,
      objectId: event.data?.object?.id ?? null,
      livemode: event.livemode,
    })
  } catch (error) {
    if (error?.code !== 11000) throw error
    return StripeEvent.findOneAndUpdate(
      { eventId: event.id },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' },
    )
  }
}

/** Applies a verified event once. Throws (so Stripe retries) if processing fails. */
export async function handleEvent(event) {
  const record = await recordEvent(event)
  if (['processed', 'ignored'].includes(record.status)) return

  if (event.livemode || !HANDLERS[event.type]) {
    if (event.livemode) logger.warn(`Ignoring live mode event ${event.id}`)
    await StripeEvent.updateOne({ _id: record._id }, { status: 'ignored', processedAt: new Date() })
    return
  }

  try {
    await apply(event)
    await StripeEvent.updateOne(
      { _id: record._id },
      { status: 'processed', error: null, processedAt: new Date() },
    )
  } catch (error) {
    logger.error(`Stripe event ${event.id} (${event.type}) failed: ${error.message}`)
    await StripeEvent.updateOne({ _id: record._id }, { status: 'failed', error: error.message })
    throw error
  }
}
