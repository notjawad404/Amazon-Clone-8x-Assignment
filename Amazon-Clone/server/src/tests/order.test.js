import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  const { phoneRef } = await createStock()
  const { placed } = await placeCartOrder(shopper.as, [{ ...phoneRef, qty: 2 }])
  return { ...shopper, orderNumber: placed.body.orderNumber }
}

describe('GET /api/orders/:orderNumber', () => {
  it('returns a pending order with its items, totals, and payment summary', async () => {
    const { as, orderNumber } = await placeOrder()

    const res = await as('get', `/api/orders/${orderNumber}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      orderNumber,
      status: 'pending_payment',
      paymentStatus: 'unpaid',
      deliveryLabel: 'Standard',
      subtotalCents: 4000,
      totalCents: 4320,
      shippingAddress: { city: 'Nashville' },
      payment: { status: 'requires_payment_method', lastError: null, card: null },
    })
    expect(res.body.items).toEqual([
      expect.objectContaining({ title: 'Pixel 9', slug: 'pixel-9', qty: 2, lineTotalCents: 4000 }),
    ])
  })

  it('shows the card, receipt, and paid status after the payment succeeds', async () => {
    const { as, orderNumber } = await placeOrder()
    const [intent] = fakeStripe.intents.values()
    await sendStripeEvent(succeededEvent(intent))

    const res = await as('get', `/api/orders/${orderNumber}`)

    expect(res.body).toMatchObject({
      status: 'paid',
      paymentStatus: 'paid',
      paidAt: expect.any(String),
      paymentMethod: { brand: 'visa', last4: '4242' },
      payment: {
        status: 'succeeded',
        card: { brand: 'visa', last4: '4242' },
        receiptUrl: 'https://pay.stripe.com/receipts/test',
      },
    })
  })

  it('shows only the decline message, never Stripe ids or other internals', async () => {
    const { as, orderNumber } = await placeOrder()
    const [intent] = fakeStripe.intents.values()
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

    const res = await as('get', `/api/orders/${orderNumber}`)

    expect(res.body.payment).toMatchObject({
      failedAttempts: 1,
      lastError: { message: 'Your card was declined.' },
    })
    expect(JSON.stringify(res.body)).not.toMatch(/pi_test|evt_|card_declined|_secret_|"user"/)
  })

  it('returns 404 to another user and 400 for a malformed order number', async () => {
    const { orderNumber } = await placeOrder()
    const other = await createShopper({ email: 'other@example.com' })

    const stranger = await other.as('get', `/api/orders/${orderNumber}`)
    const malformed = await other.as('get', '/api/orders/not-an-order')

    expect(stranger.status).toBe(404)
    expect(stranger.body.code).toBe('order_not_found')
    expect(malformed.status).toBe(400)
  })
})
