import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { Checkout, Order, Payment, Product } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { CURRENCY, DELIVERY_METHODS, ORDER_NUMBER_ATTEMPTS } from '../utils/constants.js'
import { addMinutes } from '../utils/dates.js'
import { generateOrderNumber } from '../utils/orderNumber.js'
import { reserveStock } from './inventory.service.js'

function isOrderNumberClash(error) {
  return error?.code === 11000 && Boolean(error.keyPattern?.orderNumber)
}

function buildOrder({ checkout, lines, quote, now }) {
  return new Order({
    orderNumber: generateOrderNumber(),
    user: checkout.user,
    checkout: checkout._id,
    source: checkout.source,
    items: lines.map((line) => ({
      product: line.product,
      variantId: line.variantId,
      title: line.title,
      variantLabel: line.variantLabel,
      image: line.image?.url ?? null,
      sku: line.sku,
      unitPriceCents: line.unitPriceCents,
      qty: line.qty,
      lineTotalCents: line.lineTotalCents,
    })),
    shippingAddress: checkout.shippingAddress,
    deliveryMethod: checkout.deliveryMethod,
    estimatedDelivery: quote.estimatedDelivery,
    subtotalCents: quote.subtotalCents,
    shippingCents: quote.shippingCents,
    taxCents: quote.taxCents,
    totalCents: quote.totalCents,
    currency: CURRENCY,
    statusHistory: [{ status: 'pending_payment', at: now }],
    reservationExpiresAt: addMinutes(now, env.RESERVATION_MINUTES),
  })
}

/**
 * Turns an open checkout into a pending_payment order, reserving stock, in one transaction.
 * Claiming the checkout (open → completed) comes first, so a second concurrent request for the
 * same checkout fails with `checkout_already_placed` and its transaction writes nothing.
 */
export async function createOrder({ checkout, lines, quote }) {
  const session = await mongoose.startSession()
  try {
    for (let attempt = 1; ; attempt += 1) {
      let order
      try {
        await session.withTransaction(async () => {
          const claimed = await Checkout.updateOne(
            { _id: checkout._id, status: 'open' },
            { $set: { status: 'completed' } },
            { session },
          )
          if (!claimed.modifiedCount) {
            throw new ApiError(409, 'This checkout was already placed.', {
              code: 'checkout_already_placed',
            })
          }
          await reserveStock(lines, session)
          order = buildOrder({ checkout, lines, quote, now: new Date() })
          await order.save({ session })
          await Checkout.updateOne(
            { _id: checkout._id },
            { $set: { order: order._id } },
            { session },
          )
        })
        return order
      } catch (error) {
        if (!isOrderNumberClash(error) || attempt >= ORDER_NUMBER_ATTEMPTS) throw error
      }
    }
  } finally {
    await session.endSession()
  }
}

export async function findUserOrder(userId, orderNumber) {
  const order = await Order.findOne({ orderNumber, user: userId })
  if (!order) throw new ApiError(404, 'Order not found', { code: 'order_not_found' })
  return order
}

function toPaymentSummary(payment) {
  if (!payment) return null
  return {
    status: payment.status,
    failedAttempts: payment.failedAttempts,
    lastError: payment.lastError ? { message: payment.lastError.message } : null,
    card: payment.card ? { brand: payment.card.brand, last4: payment.card.last4 } : null,
    receiptUrl: payment.receiptUrl,
    amountRefundedCents: payment.amountRefundedCents,
  }
}

/** The order as its owner sees it: snapshot items with product links, totals, and payment. */
export async function getOrderDetails(userId, orderNumber) {
  const order = await Order.findOne({ orderNumber, user: userId }).lean()
  if (!order) throw new ApiError(404, 'Order not found', { code: 'order_not_found' })

  const productIds = [...new Set(order.items.map((item) => String(item.product)))]
  const [products, payment] = await Promise.all([
    Product.find({ _id: mongoose.trusted({ $in: productIds }), status: 'active' })
      .select('slug')
      .lean(),
    Payment.findOne({ order: order._id }).lean(),
  ])
  const slugs = new Map(products.map((product) => [String(product._id), product.slug]))

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    source: order.source,
    placedAt: order.createdAt,
    paidAt: order.paidAt,
    cancelledAt: order.cancelledAt,
    cancelReason: order.cancelReason,
    reservationExpiresAt: order.reservationExpiresAt,
    items: order.items.map((item) => ({
      productId: item.product,
      variantId: item.variantId,
      slug: slugs.get(String(item.product)) ?? null,
      title: item.title,
      variantLabel: item.variantLabel,
      image: item.image,
      qty: item.qty,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
    })),
    shippingAddress: order.shippingAddress,
    deliveryMethod: order.deliveryMethod,
    deliveryLabel: DELIVERY_METHODS[order.deliveryMethod].label,
    estimatedDelivery: order.estimatedDelivery,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    payment: toPaymentSummary(payment),
  }
}
