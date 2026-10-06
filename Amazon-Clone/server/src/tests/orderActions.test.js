import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Order, Payment, Product } from '../models/index.js'
import { advanceOrders } from '../seed/advanceOrders.js'
import { addDays } from '../utils/dates.js'
import {
  createShopper,
  createStock,
  placeCartOrder,
  sendStripeEvent,
  succeededEvent,
} from './checkoutHelpers.js'
import { fakeStripe } from './stripeFake.js'

vi.mock('../config/stripe.js', async () => (await import('./stripeFake.js')).stripeModule)

beforeEach(() => {
  fakeStripe.reset()
})

async function placeOrder({ pay = false } = {}) {
  const shopper = await createShopper()
  const stock = await createStock()
  const { placed } = await placeCartOrder(shopper.as, [{ ...stock.phoneRef, qty: 2 }])
  const { orderNumber } = placed.body
  const intent = [...fakeStripe.intents.values()].at(-1)
  if (pay) await sendStripeEvent(succeededEvent(intent))
  return { ...shopper, ...stock, orderNumber, intent }
}

const stockOf = async (product) => (await Product.findById(product._id)).variants[0].stock
const cancel = (as, orderNumber) => as('post', `/api/orders/${orderNumber}/cancel`)

describe('GET /api/orders', () => {
  it('lists the user’s orders newest first, filtered by range, with the years they span', async () => {
    const { as, orderNumber } = await placeOrder()
    // createdAt is immutable through Mongoose, so back-date it on the raw collection.
    await Order.collection.updateOne(
      { orderNumber },
      { $set: { createdAt: addDays(new Date(), -40) } },
    )
    const other = await createShopper({ email: 'other@example.com' })

    const recent = await as('get', '/api/orders').query({ range: '30d' })
    const threeMonths = await as('get', '/api/orders')
    const otherUser = await other.as('get', '/api/orders')
    const year = String(new Date().getUTCFullYear())

    expect(recent.body).toMatchObject({ items: [], total: 0 })
    expect(threeMonths.body).toMatchObject({ total: 1, page: 1, pages: 1, years: [year] })
    expect(threeMonths.body.items[0]).toMatchObject({
      orderNumber,
      status: 'pending_payment',
      canCancel: true,
      shippingAddress: { city: 'Nashville' },
      items: [expect.objectContaining({ title: 'Pixel 9', slug: 'pixel-9', qty: 2 })],
    })
    expect(otherUser.body.total).toBe(0)
  })

  it('pages 10 at a time and validates the range', async () => {
    const { as, orderNumber } = await placeOrder()
    const template = await Order.findOne({ orderNumber }).lean()
    const copies = Array.from({ length: 11 }, (_, i) => {
      const copy = { ...template }
      delete copy._id
      return {
        ...copy,
        orderNumber: `112-0000000-00000${String(i).padStart(2, '0')}`,
        checkout: new template.checkout.constructor(),
        createdAt: addDays(new Date(), -i - 1),
      }
    })
    await Order.insertMany(copies)

    const second = await as('get', '/api/orders').query({ page: 2 })
    const invalid = await as('get', '/api/orders').query({ range: 'forever' })

    expect(second.body).toMatchObject({ total: 12, page: 2, pages: 2 })
    expect(second.body.items).toHaveLength(2)
    expect(invalid.status).toBe(400)
  })
})

describe('POST /api/orders/:orderNumber/cancel', () => {
  it('cancels an unpaid order, cancels its PaymentIntent, and puts the stock back', async () => {
    const { as, phone, orderNumber, intent } = await placeOrder()

    const res = await cancel(as, orderNumber)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      status: 'cancelled',
      cancelReason: 'user_cancelled',
      canCancel: false,
    })
    expect(res.body.statusHistory.map((step) => step.status)).toEqual([
      'pending_payment',
      'cancelled',
    ])
    expect(fakeStripe.client.paymentIntents.cancel).toHaveBeenCalledWith(intent.id)
    expect(fakeStripe.client.refunds.create).not.toHaveBeenCalled()
    expect(await stockOf(phone)).toBe(5)
  })

  it('cancels a paid order, refunds it once, and takes back its sales', async () => {
    const { as, phone, orderNumber, intent } = await placeOrder({ pay: true })
    const order = await Order.findOne({ orderNumber })

    const res = await cancel(as, orderNumber)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('cancelled')
    expect(fakeStripe.client.refunds.create).toHaveBeenCalledWith(
      { payment_intent: intent.id },
      { idempotencyKey: `refund-${order._id}` },
    )
    expect(await stockOf(phone)).toBe(5)
    expect((await Product.findById(phone._id)).salesCount).toBe(0)
  })

  it('shows Refunded after the charge.refunded webhook', async () => {
    const { as, orderNumber, intent } = await placeOrder({ pay: true })
    await cancel(as, orderNumber)

    await sendStripeEvent({
      id: 'evt_refunded_1',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_1',
          payment_intent: intent.id,
          amount: intent.amount,
          amount_refunded: intent.amount,
          refunds: {
            data: [
              { id: 're_test_1', amount: intent.amount, status: 'succeeded', created: 1791200000 },
            ],
          },
        },
      },
    })
    const res = await as('get', `/api/orders/${orderNumber}`)

    expect(res.body.paymentStatus).toBe('refunded')
    expect(res.body.payment.refunds).toEqual([
      expect.objectContaining({ amountCents: intent.amount, status: 'succeeded' }),
    ])
  })

  it('fetches the refunds when the charge in the event does not include them', async () => {
    const { as, orderNumber, intent } = await placeOrder({ pay: true })
    await cancel(as, orderNumber)
    fakeStripe.client.refunds.list.mockResolvedValueOnce({
      data: [{ id: 're_test_2', amount: intent.amount, status: 'succeeded', created: 1791200000 }],
    })

    await sendStripeEvent({
      id: 'evt_refunded_2',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_1',
          payment_intent: intent.id,
          amount: intent.amount,
          amount_refunded: intent.amount,
        },
      },
    })
    const res = await as('get', `/api/orders/${orderNumber}`)

    expect(fakeStripe.client.refunds.list).toHaveBeenCalledWith({
      payment_intent: intent.id,
      limit: 100,
    })
    expect(res.body.paymentStatus).toBe('refunded')
    expect(res.body.payment.refunds).toEqual([
      expect.objectContaining({ amountCents: intent.amount, status: 'succeeded' }),
    ])
  })

  it.each([['shipped'], ['delivered']])('refuses to cancel a %s order', async (target) => {
    const { as, orderNumber } = await placeOrder({ pay: true })
    await advanceOrders()
    if (target === 'delivered') await advanceOrders()

    const res = await cancel(as, orderNumber)

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('order_not_cancellable')
  })

  it('refuses while the payment is going through', async () => {
    const { as, orderNumber, intent } = await placeOrder()
    intent.status = 'processing'

    const res = await cancel(as, orderNumber)

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('payment_in_progress')
    expect((await Order.findOne({ orderNumber })).status).toBe('pending_payment')
  })

  it('reports a failed refund and retries it when cancel is called again', async () => {
    const { as, orderNumber } = await placeOrder({ pay: true })
    fakeStripe.client.refunds.create.mockRejectedValueOnce(new Error('Stripe is down'))

    const failed = await cancel(as, orderNumber)
    const retried = await cancel(as, orderNumber)

    expect(failed.status).toBe(502)
    expect(failed.body.code).toBe('refund_failed')
    expect((await Order.findOne({ orderNumber })).status).toBe('cancelled')
    expect(retried.status).toBe(200)
    expect(fakeStripe.client.refunds.create).toHaveBeenCalledTimes(2)
  })

  it('records the refund locally for seeded demo payments', async () => {
    const { as, orderNumber } = await placeOrder({ pay: true })
    const order = await Order.findOne({ orderNumber })
    await Payment.updateOne({ order: order._id }, { stripePaymentIntentId: 'pi_seed_1' })

    const res = await cancel(as, orderNumber)

    expect(fakeStripe.client.refunds.create).not.toHaveBeenCalled()
    expect(res.body).toMatchObject({ status: 'cancelled', paymentStatus: 'refunded' })
  })

  it('returns 404 for another user’s order', async () => {
    const { orderNumber } = await placeOrder()
    const other = await createShopper({ email: 'other@example.com' })

    const res = await cancel(other.as, orderNumber)

    expect(res.status).toBe(404)
  })
})

describe('POST /api/orders/:orderNumber/buy-again', () => {
  it('adds what is still available and reports what was skipped', async () => {
    const shopper = await createShopper()
    const { phone, charger, phoneRef, chargerRef } = await createStock()
    const { placed } = await placeCartOrder(shopper.as, [phoneRef, chargerRef])
    await sendStripeEvent(succeededEvent([...fakeStripe.intents.values()][0]))
    await Product.updateOne({ _id: charger._id }, { $set: { 'variants.0.stock': 0 } })
    await Product.updateOne({ _id: phone._id }, { $set: { status: 'archived' } })

    const res = await shopper.as('post', `/api/orders/${placed.body.orderNumber}/buy-again`)

    expect(res.status).toBe(200)
    expect(res.body.addedCount).toBe(0)
    expect(res.body.skipped).toEqual([
      { title: 'Pixel 9', reason: 'No longer available' },
      { title: 'Charger', reason: 'Out of stock' },
    ])
  })

  it('puts the items back in the cart', async () => {
    const shopper = await createShopper()
    const { phoneRef } = await createStock()
    const { placed } = await placeCartOrder(shopper.as, [{ ...phoneRef, qty: 2 }])
    await sendStripeEvent(succeededEvent([...fakeStripe.intents.values()][0]))

    const res = await shopper.as('post', `/api/orders/${placed.body.orderNumber}/buy-again`)

    expect(res.body).toMatchObject({ addedCount: 1, skipped: [] })
    expect(res.body.cart.items).toEqual([
      expect.objectContaining({ title: 'Pixel 9', qty: 2, savedForLater: false }),
    ])
  })
})

describe('advanceOrders', () => {
  it('moves paid → shipped → delivered one step per run, with timeline entries', async () => {
    const { as, orderNumber } = await placeOrder({ pay: true })

    await advanceOrders()
    const shipped = (await as('get', `/api/orders/${orderNumber}`)).body
    await advanceOrders()
    const delivered = (await as('get', `/api/orders/${orderNumber}`)).body

    expect(shipped).toMatchObject({ status: 'shipped', shippedAt: expect.any(String) })
    expect(delivered).toMatchObject({ status: 'delivered', deliveredAt: expect.any(String) })
    expect(delivered.statusHistory.map((step) => step.status)).toEqual([
      'pending_payment',
      'paid',
      'shipped',
      'delivered',
    ])
  })
})
