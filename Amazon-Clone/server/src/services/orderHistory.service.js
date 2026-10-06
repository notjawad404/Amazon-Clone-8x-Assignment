import mongoose from 'mongoose'
import { Order, Payment, Product } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import {
  CANCELLABLE_ORDER_STATUSES,
  DELIVERY_METHODS,
  ORDERS_PAGE_SIZE,
} from '../utils/constants.js'
import { addDays } from '../utils/dates.js'

const RANGE_DAYS = { '30d': 30, '3m': 90 }

const CONFIRMING = ['processing', 'succeeded']

// For an unpaid order: has the shopper paid (and Stripe is still confirming), or not yet?
function paymentState(order, payment) {
  if (order.status !== 'pending_payment') return null
  if (CONFIRMING.includes(payment?.status)) return 'confirming'
  return payment?.lastError ? 'failed' : 'awaiting'
}

export function canCancel(order) {
  return CANCELLABLE_ORDER_STATUSES.includes(order.status)
}

function createdAtFilter(range, now) {
  if (RANGE_DAYS[range]) return mongoose.trusted({ $gte: addDays(now, -RANGE_DAYS[range]) })
  const year = Number(range)
  return mongoose.trusted({
    $gte: new Date(Date.UTC(year, 0, 1)),
    $lt: new Date(Date.UTC(year + 1, 0, 1)),
  })
}

// One query for every product on the page; archived products get no link.
async function slugsFor(orders) {
  const productIds = [
    ...new Set(orders.flatMap((order) => order.items.map((item) => String(item.product)))),
  ]
  if (!productIds.length) return new Map()
  const products = await Product.find({
    _id: mongoose.trusted({ $in: productIds }),
    status: 'active',
  })
    .select('slug')
    .lean()
  return new Map(products.map((product) => [String(product._id), product.slug]))
}

function toItem(item, slugs) {
  return {
    productId: item.product,
    variantId: item.variantId,
    slug: slugs.get(String(item.product)) ?? null,
    title: item.title,
    variantLabel: item.variantLabel,
    image: item.image,
    qty: item.qty,
    unitPriceCents: item.unitPriceCents,
    lineTotalCents: item.lineTotalCents,
  }
}

function toOrderSummary(order, slugs, payment) {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    placedAt: order.createdAt,
    totalCents: order.totalCents,
    shippingAddress: order.shippingAddress,
    estimatedDelivery: order.estimatedDelivery,
    shippedAt: order.shippedAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
    canCancel: canCancel(order),
    paymentState: paymentState(order, payment),
    items: order.items.map((item) => toItem(item, slugs)),
  }
}

async function orderYears(userId) {
  const rows = await Order.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(String(userId)) } },
    { $group: { _id: { $year: '$createdAt' } } },
    { $sort: { _id: -1 } },
  ])
  return rows.map((row) => String(row._id))
}

export async function listOrders(userId, { range, page }, now = new Date()) {
  const filter = { user: userId, createdAt: createdAtFilter(range, now) }
  const [orders, total, years] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * ORDERS_PAGE_SIZE)
      .limit(ORDERS_PAGE_SIZE)
      .lean(),
    Order.countDocuments(filter),
    orderYears(userId),
  ])
  const [slugs, payments] = await Promise.all([
    slugsFor(orders),
    Payment.find({ order: mongoose.trusted({ $in: orders.map((order) => order._id) }) })
      .select('order status lastError')
      .lean(),
  ])
  const paymentsByOrder = new Map(payments.map((payment) => [String(payment.order), payment]))

  return {
    items: orders.map((order) =>
      toOrderSummary(order, slugs, paymentsByOrder.get(String(order._id))),
    ),
    total,
    page,
    pages: Math.ceil(total / ORDERS_PAGE_SIZE),
    years,
  }
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
    refunds: payment.refunds.map(({ amountCents, status, createdAt }) => ({
      amountCents,
      status,
      createdAt,
    })),
  }
}

/** The order as its owner sees it: snapshot items with product links, totals, and payment. */
export async function getOrderDetails(userId, orderNumber) {
  const order = await Order.findOne({ orderNumber, user: userId }).lean()
  if (!order) throw new ApiError(404, 'Order not found', { code: 'order_not_found' })

  const [slugs, payment] = await Promise.all([
    slugsFor([order]),
    Payment.findOne({ order: order._id }).lean(),
  ])

  return {
    ...toOrderSummary(order, slugs, payment),
    source: order.source,
    paidAt: order.paidAt,
    cancelReason: order.cancelReason,
    reservationExpiresAt: order.reservationExpiresAt,
    statusHistory: order.statusHistory.map(({ status, at, note }) => ({ status, at, note })),
    deliveryMethod: order.deliveryMethod,
    deliveryLabel: DELIVERY_METHODS[order.deliveryMethod].label,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    payment: toPaymentSummary(payment),
  }
}
