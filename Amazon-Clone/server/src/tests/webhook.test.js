import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import app from '../app.js'
import { expirePendingOrders } from '../jobs/expirePendingOrders.js'
import { Cart, Order, Payment, StripeEvent } from '../models/index.js'
import { addMinutes } from '../utils/dates.js'
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

async function placedOrder(items = 'phone') {
  const shopper = await createShopper()
  const stock = await createStock()
  const lines = items === 'both' ? [stock.phoneRef, stock.chargerRef] : [stock.phoneRef]
  const { placed } = await placeCartOrder(shopper.as, lines)
  const order = await Order.findOne({ orderNumber: placed.body.orderNumber })
  const payment = await Payment.findOne({ order: order._id })
  const intent = fakeStripe.intents.get(payment.stripePaymentIntentId)
  return { ...shopper, ...stock, order, intent }
}

const reload = (doc) => doc.constructor.findById(doc._id)

describe('POST /api/webhooks/stripe', () => {
  it('rejects a request without a valid signature', async () => {
    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 't=1,v1=bad')
      .send(JSON.stringify({ id: 'evt_1', type: 'payment_intent.succeeded' }))

    expect(res.status).toBe(400)
  })

  it('marks the order paid, records the card, counts sales, and empties the cart', async () => {
    const { user, phone, order, intent } = await placedOrder('both')

    const res = await sendStripeEvent(succeededEvent(intent))

    expect(res.status).toBe(200)
    const paid = await reload(order)
    expect(paid).toMatchObject({
      status: 'paid',
      paymentStatus: 'paid',
      reservationExpiresAt: null,
    })
    expect(paid.paymentMethod).toMatchObject({ brand: 'visa', last4: '4242' })
    expect(await Payment.findOne({ order: order._id })).toMatchObject({
      status: 'succeeded',
      receiptUrl: 'https://pay.stripe.com/receipts/test',
    })
    expect((await reload(phone)).salesCount).toBe(1)
    expect(await Cart.exists({ user: user._id })).toBeNull()
  })

  it('applies the same event only once when Stripe delivers it twice', async () => {
    const { phone, intent } = await placedOrder()
    const event = succeededEvent(intent)

    await sendStripeEvent(event)
    const again = await sendStripeEvent(event)

    expect(again.status).toBe(200)
    expect((await reload(phone)).salesCount).toBe(1)
    expect(await StripeEvent.findOne({ eventId: event.id })).toMatchObject({
      status: 'processed',
      attempts: 2,
    })
  })

  it('does not mark the order paid when the amount does not match', async () => {
    const { order, intent } = await placedOrder()

    await sendStripeEvent(succeededEvent(intent, { amount: intent.amount - 1 }))

    expect((await reload(order)).status).toBe('pending_payment')
  })

  it('keeps a declined order pending so the same PaymentIntent can be retried', async () => {
    const { order, intent } = await placedOrder()

    await sendStripeEvent({
      id: 'evt_failed_1',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: intent.id,
          last_payment_error: { code: 'card_declined', message: 'Your card was declined.' },
        },
      },
    })
    const declined = await Payment.findOne({ order: order._id })
    await sendStripeEvent(succeededEvent(intent))

    expect(declined).toMatchObject({ status: 'requires_payment_method', failedAttempts: 1 })
    expect(declined.lastError.message).toBe('Your card was declined.')
    expect((await reload(order)).status).toBe('paid')
    expect(fakeStripe.intents.size).toBe(1)
  })

  it('leaves the cart alone for a Buy Now order', async () => {
    const { as, user } = await createShopper()
    const { phoneRef, chargerRef } = await createStock()
    await as('post', '/api/cart/items').send(chargerRef)
    const checkout = await as('post', '/api/checkout').send({
      source: 'buy_now',
      item: { ...phoneRef, qty: 1 },
    })
    await as('post', `/api/checkout/${checkout.body._id}/place`).send({
      expectedTotalCents: checkout.body.quote.totalCents,
    })

    await sendStripeEvent(succeededEvent([...fakeStripe.intents.values()][0]))

    const cart = await Cart.findOne({ user: user._id }).lean()
    expect(cart.items).toHaveLength(1)
  })
})

describe('expirePendingOrders', () => {
  it('cancels an unpaid order, puts the stock back, and cancels the PaymentIntent', async () => {
    const { phone, order, intent } = await placedOrder()

    const expired = await expirePendingOrders(addMinutes(new Date(), 31))

    expect(expired).toBe(1)
    expect(await reload(order)).toMatchObject({
      status: 'cancelled',
      cancelReason: 'reservation_expired',
    })
    expect((await reload(phone)).variants[0].stock).toBe(5)
    expect(fakeStripe.client.paymentIntents.cancel).toHaveBeenCalledWith(intent.id)
    expect((await Payment.findOne({ order: order._id })).status).toBe('canceled')
  })

  it('skips orders whose payment already succeeded or is processing', async () => {
    const { order, intent } = await placedOrder()
    intent.status = 'processing'

    const expired = await expirePendingOrders(addMinutes(new Date(), 31))

    expect(expired).toBe(0)
    expect((await reload(order)).status).toBe('pending_payment')
  })

  it('refunds a payment that succeeds after the order expired', async () => {
    const { order, intent } = await placedOrder()
    await expirePendingOrders(addMinutes(new Date(), 31))

    await sendStripeEvent(succeededEvent(intent))

    expect((await reload(order)).status).toBe('cancelled')
    expect(fakeStripe.client.refunds.create).toHaveBeenCalledWith(
      { payment_intent: intent.id },
      { idempotencyKey: `refund-${order._id}` },
    )
  })
})
