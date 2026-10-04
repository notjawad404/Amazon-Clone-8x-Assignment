import mongoose from 'mongoose'
import { Order, Payment } from '../models/index.js'
import { releaseStock } from '../services/inventory.service.js'
import { cancelPaymentIntent } from '../services/payment.service.js'
import { EXPIRY_BATCH_SIZE, EXPIRY_JOB_INTERVAL_MS } from '../utils/constants.js'
import { logger } from '../utils/logger.js'

const SETTLED_BY_WEBHOOK = ['succeeded', 'processing']

async function expireOrder(orderId) {
  const payment = await Payment.findOne({ order: orderId }).lean()
  if (payment) {
    const status = await cancelPaymentIntent(payment.stripePaymentIntentId)
    if (SETTLED_BY_WEBHOOK.includes(status)) return false
  }

  const session = await mongoose.startSession()
  let expired = false
  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ _id: orderId, status: 'pending_payment' }).session(
        session,
      )
      if (!order) return
      order.transitionTo('cancelled', {
        cancelReason: 'reservation_expired',
        note: 'Not paid in time',
      })
      await order.save({ session })
      await releaseStock(order.items, session)
      await Payment.updateOne(
        { order: orderId, status: mongoose.trusted({ $ne: 'succeeded' }) },
        { $set: { status: 'canceled', canceledAt: new Date() } },
        { session },
      )
      expired = true
    })
  } finally {
    await session.endSession()
  }
  return expired
}

/** Cancels unpaid orders whose reservation has run out and puts their stock back. */
export async function expirePendingOrders(now = new Date()) {
  const orders = await Order.find({
    status: 'pending_payment',
    reservationExpiresAt: mongoose.trusted({ $lt: now }),
  })
    .select('_id orderNumber')
    .limit(EXPIRY_BATCH_SIZE)
    .lean()

  let expired = 0
  for (const { _id, orderNumber } of orders) {
    try {
      if (await expireOrder(_id)) expired += 1
    } catch (error) {
      logger.error(`Could not expire order ${orderNumber}: ${error.message}`)
    }
  }
  return expired
}

export function startExpiryJob() {
  const timer = setInterval(async () => {
    try {
      const expired = await expirePendingOrders()
      if (expired) logger.info(`Expired ${expired} unpaid order(s)`)
    } catch (error) {
      logger.error(`Order expiry job failed: ${error.message}`)
    }
  }, EXPIRY_JOB_INTERVAL_MS)
  timer.unref()
  return timer
}
