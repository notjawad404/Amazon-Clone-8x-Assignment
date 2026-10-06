import mongoose from 'mongoose'
import { Order, Payment } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { SEED_PAYMENT_INTENT_PREFIX } from '../utils/constants.js'
import { logger } from '../utils/logger.js'
import { addItemsToCart } from './cart.service.js'
import { releaseStock, reverseSales } from './inventory.service.js'
import { findUserOrder } from './order.service.js'
import { canCancel } from './orderHistory.service.js'
import { cancelPaymentIntent, refundOrder } from './payment.service.js'

const SETTLING = ['succeeded', 'processing']

const SKIP_MESSAGES = {
  unavailable: 'No longer available',
  out_of_stock: 'Out of stock',
  cart_full: 'Your cart is full',
}

// Demo orders from the seed have no real PaymentIntent, so their refund is recorded here instead
// of arriving through the charge.refunded webhook.
async function recordSeedRefund(order, payment) {
  await Payment.updateOne(
    { _id: payment._id },
    {
      $set: { amountRefundedCents: payment.amountCents },
      $push: {
        refunds: {
          stripeRefundId: `re_seed_${order._id}`,
          amountCents: payment.amountCents,
          status: 'succeeded',
          reason: 'requested_by_customer',
          createdAt: new Date(),
        },
      },
    },
  )
  await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: 'refunded' } })
}

async function refundPaidOrder(order, payment) {
  if (payment.stripePaymentIntentId.startsWith(SEED_PAYMENT_INTENT_PREFIX)) {
    return recordSeedRefund(order, payment)
  }
  try {
    await refundOrder(order, payment.stripePaymentIntentId)
  } catch (error) {
    logger.error(`Refund failed for order ${order.orderNumber}: ${error.message}`)
    throw new ApiError(
      502,
      'Your order was cancelled, but the refund didn’t go through. Cancel it again to retry.',
      { code: 'refund_failed' },
    )
  }
  return undefined
}

// Returns the status the order had, or throws if it changed since it was read.
async function cancelInTransaction(order) {
  const session = await mongoose.startSession()
  let previousStatus
  try {
    await session.withTransaction(async () => {
      const current = await Order.findOne({ _id: order._id, status: order.status }).session(session)
      if (!current) {
        throw new ApiError(409, 'This order just changed. Refresh the page and try again.', {
          code: 'order_changed',
        })
      }
      previousStatus = current.status
      current.transitionTo('cancelled', {
        cancelReason: 'user_cancelled',
        note: 'Cancelled by you',
      })
      await current.save({ session })
      await releaseStock(current.items, session)
      if (previousStatus === 'paid') await reverseSales(current.items, session)
      else {
        await Payment.updateOne(
          { order: order._id },
          { $set: { status: 'canceled', canceledAt: new Date() } },
          { session },
        )
      }
    })
  } finally {
    await session.endSession()
  }
  return previousStatus
}

/**
 * Cancels a pending or paid order, puts the stock back, and refunds a paid one. Calling it again
 * on a cancelled order whose refund failed retries the refund.
 */
export async function cancelOrder(userId, orderNumber) {
  const order = await findUserOrder(userId, orderNumber)
  const payment = await Payment.findOne({ order: order._id }).lean()

  if (order.status === 'cancelled') {
    if (order.paymentStatus === 'paid' && payment) await refundPaidOrder(order, payment)
    return
  }
  if (!canCancel(order)) {
    throw new ApiError(409, 'This order has shipped and can no longer be cancelled.', {
      code: 'order_not_cancellable',
    })
  }
  if (order.status === 'pending_payment' && payment) {
    const status = await cancelPaymentIntent(payment.stripePaymentIntentId)
    if (SETTLING.includes(status)) {
      throw new ApiError(409, 'Your payment is going through. Try again in a moment.', {
        code: 'payment_in_progress',
      })
    }
  }

  const previousStatus = await cancelInTransaction(order)
  if (previousStatus === 'paid' && payment) await refundPaidOrder(order, payment)
}

/** Adds the order's items to the cart again and reports the ones that couldn't be added. */
export async function buyAgain(userId, orderNumber) {
  const order = await findUserOrder(userId, orderNumber)
  const { cart, skipped } = await addItemsToCart(
    userId,
    order.items.map((item) => ({
      productId: item.product,
      variantId: item.variantId,
      qty: item.qty,
    })),
  )
  const titles = new Map(order.items.map((item) => [String(item.variantId), item.title]))
  return {
    cart,
    addedCount: order.items.length - skipped.length,
    skipped: skipped.map(({ variantId, reason }) => ({
      title: titles.get(variantId),
      reason: SKIP_MESSAGES[reason],
    })),
  }
}
