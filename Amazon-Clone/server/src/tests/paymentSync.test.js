import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expirePendingOrders } from '../jobs/expirePendingOrders.js'
import { Cart, Order, Product } from '../models/index.js'
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

async function placeOrder() {
  const shopper = await createShopper()
  const stock = await createStock()
  const { placed } = await placeCartOrder(shopper.as, [stock.phoneRef])
  const intent = [...fakeStripe.intents.values()].at(-1)
  return { ...shopper, ...stock, orderNumber: placed.body.orderNumber, intent }
}

// What Stripe holds after the card is charged, whether or not a webhook was sent.
function chargeAtStripe(intent) {
  Object.assign(intent, {
    status: 'succeeded',
    amount_received: intent.amount,
    latest_charge: {
      id: 'ch_test_1',
      receipt_url: 'https://pay.stripe.com/receipts/test',
      payment_method_details: { card: { brand: 'visa', last4: '4242' } },
    },
  })
}

describe('payments without a webhook', () => {
  it('records a payment Stripe already took when the order is read', async () => {
    const { user, as, phone, orderNumber, intent } = await placeOrder()
    chargeAtStripe(intent)

    const res = await as('get', `/api/orders/${orderNumber}`)

    expect(res.body).toMatchObject({
      status: 'paid',
      paymentStatus: 'paid',
      paymentState: null,
      payment: { status: 'succeeded', card: { last4: '4242' } },
    })
    expect((await Product.findById(phone._id)).salesCount).toBe(1)
    expect(await Cart.exists({ user: user._id })).toBeNull()
  })

  it('does not count the sale twice when the webhook arrives afterwards', async () => {
    const { as, phone, orderNumber, intent } = await placeOrder()
    chargeAtStripe(intent)
    await as('get', '/api/orders')

    await sendStripeEvent(succeededEvent(intent))

    expect((await Order.findOne({ orderNumber })).status).toBe('paid')
    expect((await Product.findById(phone._id)).salesCount).toBe(1)
  })

  it('shows a payment Stripe is still processing as being confirmed', async () => {
    const { as, orderNumber, intent } = await placeOrder()
    intent.status = 'processing'

    const res = await as('get', '/api/orders')

    expect(res.body.items[0]).toMatchObject({
      orderNumber,
      status: 'pending_payment',
      paymentState: 'confirming',
    })
  })

  it('tells an unpaid order apart from a declined one', async () => {
    const { as, orderNumber, intent } = await placeOrder()
    const unpaid = await as('get', `/api/orders/${orderNumber}`)

    await sendStripeEvent({
      id: 'evt_failed_1',
      type: 'payment_intent.payment_failed',
      data: {
        object: { id: intent.id, last_payment_error: { message: 'Your card was declined.' } },
      },
    })
    const declined = await as('get', `/api/orders/${orderNumber}`)

    expect(unpaid.body.paymentState).toBe('awaiting')
    expect(declined.body.paymentState).toBe('failed')
  })

  it('marks an expiring order paid instead of cancelling it when Stripe has the payment', async () => {
    const { phone, orderNumber, intent } = await placeOrder()
    chargeAtStripe(intent)

    const expired = await expirePendingOrders(addMinutes(new Date(), 31))

    expect(expired).toBe(0)
    expect((await Order.findOne({ orderNumber })).status).toBe('paid')
    expect((await Product.findById(phone._id)).variants[0].stock).toBe(4)
  })

  it('still returns the order when Stripe cannot be reached', async () => {
    const { as, orderNumber } = await placeOrder()
    fakeStripe.client.paymentIntents.retrieve.mockRejectedValueOnce(new Error('Stripe is down'))

    const res = await as('get', `/api/orders/${orderNumber}`)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('pending_payment')
  })
})
