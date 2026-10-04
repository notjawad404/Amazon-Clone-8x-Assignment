import { Cart, Checkout, Order, User } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { findUserAddress, toAddressSnapshot } from './address.service.js'
import { priceCheckout } from './checkoutPricing.service.js'
import { createOrder } from './order.service.js'
import { ensurePaymentIntent } from './payment.service.js'

function notFound() {
  return new ApiError(404, 'Checkout not found', { code: 'checkout_not_found' })
}

function toView(checkout, priced) {
  return {
    _id: checkout._id,
    source: checkout.source,
    status: checkout.status,
    items: priced.lines.map(({ product, ...line }) => ({ ...line, productId: product })),
    addressId: checkout.addressId,
    shippingAddress: checkout.shippingAddress,
    deliveryMethod: checkout.deliveryMethod,
    deliveryOptions: priced.deliveryOptions,
    quote: priced.quote,
    issues: priced.issues,
  }
}

async function completedView(checkout) {
  const order = await Order.findById(checkout.order).select('orderNumber').lean()
  return { _id: checkout._id, status: 'completed', orderNumber: order?.orderNumber ?? null }
}

// Re-prices from current product data and stores the result, so a reload shows fresh numbers.
async function refresh(checkout) {
  const priced = await priceCheckout(checkout)
  checkout.quote = priced.quote
  checkout.issues = priced.issues
  await checkout.save()
  return { checkout, priced }
}

async function itemsFor(userId, source, item) {
  if (source === 'buy_now') {
    return [{ product: item.productId, variantId: item.variantId, qty: item.qty }]
  }
  const cart = await Cart.findOne({ user: userId }).lean()
  const items = (cart?.items ?? []).filter((line) => !line.savedForLater)
  if (!items.length) throw new ApiError(409, 'Your cart is empty.', { code: 'cart_empty' })
  return items.map(({ product, variantId, qty }) => ({ product, variantId, qty }))
}

async function defaultAddress(userId) {
  const user = await User.findById(userId).select('addresses').lean()
  return user?.addresses.find((address) => address.isDefault) ?? null
}

async function findOwnCheckout(userId, checkoutId) {
  const checkout = await Checkout.findOne({ _id: checkoutId, user: userId })
  if (!checkout) throw notFound()
  return checkout
}

export async function startCheckout(userId, { source, item }) {
  const [items, address] = await Promise.all([
    itemsFor(userId, source, item),
    defaultAddress(userId),
  ])
  await Checkout.deleteMany({ user: userId, status: 'open' })

  const checkout = new Checkout({
    user: userId,
    source,
    items,
    addressId: address?._id ?? null,
    shippingAddress: address ? toAddressSnapshot(address) : null,
  })
  const { priced } = await refresh(checkout)
  return toView(checkout, priced)
}

export async function getCheckout(userId, checkoutId) {
  const checkout = await findOwnCheckout(userId, checkoutId)
  if (checkout.status === 'completed') return completedView(checkout)
  const { priced } = await refresh(checkout)
  return toView(checkout, priced)
}

export async function updateCheckout(userId, checkoutId, { addressId, deliveryMethod }) {
  const checkout = await findOwnCheckout(userId, checkoutId)
  if (checkout.status === 'completed') return completedView(checkout)
  if (addressId) {
    const address = await findUserAddress(userId, addressId)
    checkout.addressId = address._id
    checkout.shippingAddress = toAddressSnapshot(address)
  }
  if (deliveryMethod) checkout.deliveryMethod = deliveryMethod
  const { priced } = await refresh(checkout)
  return toView(checkout, priced)
}

async function paymentFor(order) {
  const { clientSecret, status } = await ensurePaymentIntent(order)
  return { orderNumber: order.orderNumber, clientSecret, paymentStatus: status }
}

/**
 * Places the order. Calling it again for the same checkout (a double click, a retry after a
 * network error) returns the same order and the same PaymentIntent instead of a new one.
 */
export async function placeOrder(userId, checkoutId, { expectedTotalCents }) {
  const checkout = await findOwnCheckout(userId, checkoutId)
  if (checkout.status === 'completed') return paymentFor(await Order.findById(checkout.order))
  if (!checkout.shippingAddress) {
    throw new ApiError(409, 'Choose a shipping address.', { code: 'address_required' })
  }

  const { priced } = await refresh(checkout)
  if (priced.issues.length) {
    const [{ code }] = priced.issues
    throw new ApiError(409, 'Some items can’t be ordered right now.', {
      code: code === 'unavailable' ? 'unavailable' : 'out_of_stock',
      details: priced.issues,
    })
  }
  if (priced.quote.totalCents !== expectedTotalCents) {
    throw new ApiError(409, 'Your order total has changed.', {
      code: 'price_changed',
      details: { quote: priced.quote },
    })
  }

  let order
  try {
    order = await createOrder({ checkout, lines: priced.lines, quote: priced.quote })
  } catch (error) {
    if (error.code !== 'checkout_already_placed') throw error
    order = await Order.findOne({ checkout: checkout._id })
  }
  return paymentFor(order)
}
