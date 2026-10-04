import bcrypt from 'bcryptjs'
import { Types } from 'mongoose'
import { Checkout, Order, Payment, User } from '../models/index.js'
import { calculateQuote } from '../services/pricing.service.js'
import { BCRYPT_COST } from '../utils/constants.js'
import { addDays, addMinutes } from '../utils/dates.js'
import { generateOrderNumber } from '../utils/orderNumber.js'

export const DEMO_PASSWORD = 'Password123!'

const DEMO_ADDRESS = {
  fullName: 'Demo User',
  line1: '123 Main St',
  line2: 'Apt 4B',
  city: 'Seattle',
  state: 'Washington',
  zip: '98101',
  country: 'US',
  phone: '206-555-0100',
  isDefault: true,
}

const DEMO_CARD = { brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030, country: 'US' }

// Each order walks the real status transitions so the timeline matches what checkout produces.
const ORDER_HISTORY = [
  { daysAgo: 45, steps: ['paid', 'shipped', 'delivered'] },
  { daysAgo: 21, steps: ['paid', 'cancelled'] },
  { daysAgo: 4, steps: ['paid', 'shipped'] },
  { daysAgo: 1, steps: ['paid'] },
]
const STEP_DELAY_DAYS = { paid: 0, shipped: 1, delivered: 4, cancelled: 1 }

async function createUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST)
  const [demo, admin] = await User.create([
    { name: 'Demo User', email: 'demo@example.com', passwordHash, addresses: [DEMO_ADDRESS] },
    { name: 'Store Admin', email: 'admin@example.com', passwordHash, role: 'admin' },
  ])
  return { demo, admin }
}

function pickOrderItems(products, faker) {
  const candidates = products.filter((product) => product.variants.some((v) => v.stock > 0))
  return faker.helpers.arrayElements(candidates, { min: 1, max: 3 }).map((product) => {
    const variant =
      product.variants.find((v) => v.isDefault && v.stock > 0) ??
      product.variants.find((v) => v.stock > 0)
    const qty = faker.number.int({ min: 1, max: Math.min(2, variant.stock) })
    return {
      product: product._id,
      variantId: variant._id,
      title: product.title,
      variantLabel: variant.label,
      image: product.images[0]?.url ?? null,
      sku: variant.sku,
      unitPriceCents: variant.priceCents,
      qty,
      lineTotalCents: variant.priceCents * qty,
    }
  })
}

function buildPayment({ order, user, placedAt }) {
  const reference = order.orderNumber.replaceAll('-', '')
  return new Payment({
    order: order._id,
    user: user._id,
    stripePaymentIntentId: `pi_seed_${reference}`,
    amountCents: order.totalCents,
    status: 'succeeded',
    card: DEMO_CARD,
    stripeChargeId: `ch_seed_${reference}`,
    succeededAt: addMinutes(placedAt, 1),
    createdAt: placedAt,
  })
}

function refund(payment, at) {
  payment.amountRefundedCents = payment.amountCents
  payment.refunds.push({
    stripeRefundId: `re_seed_${payment.stripePaymentIntentId.slice('pi_seed_'.length)}`,
    amountCents: payment.amountCents,
    status: 'succeeded',
    reason: 'requested_by_customer',
    createdAt: at,
  })
}

async function createOrder({ user, address, items, placedAt, steps }) {
  const orderId = new Types.ObjectId()
  const quote = calculateQuote({ items, deliveryMethod: 'standard', now: placedAt })
  const { _id: addressId, ...shippingAddress } = address.toObject()
  delete shippingAddress.isDefault

  const checkout = new Checkout({
    user: user._id,
    source: 'cart',
    items: items.map(({ product, variantId, qty }) => ({ product, variantId, qty })),
    addressId,
    shippingAddress,
    quote,
    status: 'completed',
    order: orderId,
    expiresAt: addDays(placedAt, 1),
    createdAt: placedAt,
  })

  const order = new Order({
    _id: orderId,
    orderNumber: generateOrderNumber(),
    user: user._id,
    checkout: checkout._id,
    source: 'cart',
    items,
    shippingAddress,
    deliveryMethod: 'standard',
    estimatedDelivery: quote.estimatedDelivery,
    subtotalCents: quote.subtotalCents,
    shippingCents: quote.shippingCents,
    taxCents: quote.taxCents,
    totalCents: quote.totalCents,
    statusHistory: [{ status: 'pending_payment', at: placedAt }],
    createdAt: placedAt,
  })

  const payment = buildPayment({ order, user, placedAt })
  order.payment = payment._id
  order.paymentStatus = 'paid'
  order.paymentMethod = { brand: DEMO_CARD.brand, last4: DEMO_CARD.last4 }

  let at = placedAt
  for (const status of steps) {
    at = addMinutes(addDays(at, STEP_DELAY_DAYS[status]), 1)
    order.transitionTo(status, { at, cancelReason: 'user_cancelled' })
    if (status === 'cancelled') {
      refund(payment, at)
      order.paymentStatus = 'refunded'
    }
  }

  await checkout.save()
  await order.save()
  await payment.save()
}

export async function seedUsersAndOrders({ products, faker, now }) {
  const { demo, admin } = await createUsers()
  const address = demo.addresses[0]

  for (const { daysAgo, steps } of ORDER_HISTORY) {
    await createOrder({
      user: demo,
      address,
      items: pickOrderItems(products, faker),
      placedAt: addDays(now, -daysAgo),
      steps,
    })
  }

  return { users: [demo, admin], orderCount: ORDER_HISTORY.length }
}
