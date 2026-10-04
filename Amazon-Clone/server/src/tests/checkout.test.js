import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Checkout, Order, Payment, Product } from '../models/index.js'
import { createShopper, createStock, placeCartOrder } from './checkoutHelpers.js'
import { fakeStripe } from './stripeFake.js'

vi.mock('../config/stripe.js', async () => (await import('./stripeFake.js')).stripeModule)

beforeEach(() => {
  fakeStripe.reset()
})

const stockOf = async (product) => (await Product.findById(product._id)).variants[0].stock

describe('POST /api/checkout', () => {
  it('starts from the cart with server prices, the default address, and delivery options', async () => {
    const { as } = await createShopper()
    const { phoneRef, chargerRef } = await createStock()
    await as('post', '/api/cart/items').send({ ...phoneRef, qty: 2 })
    await as('post', '/api/cart/items').send(chargerRef)

    const res = await as('post', '/api/checkout').send({ source: 'cart' })

    expect(res.status).toBe(201)
    expect(res.body.items).toHaveLength(2)
    expect(res.body.quote).toMatchObject({
      subtotalCents: 5500,
      shippingCents: 0,
      taxCents: 440,
      totalCents: 5940,
    })
    expect(res.body.shippingAddress).toMatchObject({ city: 'Nashville', zip: '37217' })
    expect(res.body.deliveryOptions.map((option) => option.priceCents)).toEqual([0, 999, 1499])
  })

  it('rejects prices sent by the client and an empty cart', async () => {
    const { as } = await createShopper()
    const { phoneRef } = await createStock()

    const withPrice = await as('post', '/api/checkout').send({
      source: 'buy_now',
      item: { ...phoneRef, qty: 1, priceCents: 1 },
    })
    const emptyCart = await as('post', '/api/checkout').send({ source: 'cart' })

    expect(withPrice.status).toBe(400)
    expect(emptyCart.status).toBe(409)
    expect(emptyCart.body.code).toBe('cart_empty')
  })

  it('starts Buy Now with only that item and keeps one open checkout per user', async () => {
    const { user, as } = await createShopper()
    const { phoneRef, chargerRef } = await createStock()
    await as('post', '/api/cart/items').send(chargerRef)
    await as('post', '/api/checkout').send({ source: 'cart' })

    const res = await as('post', '/api/checkout').send({
      source: 'buy_now',
      item: { ...phoneRef, qty: 1 },
    })

    expect(res.body.items.map((item) => item.title)).toEqual(['Pixel 9'])
    expect(await Checkout.countDocuments({ user: user._id, status: 'open' })).toBe(1)
  })
})

describe('PATCH and GET /api/checkout/:id', () => {
  it('re-quotes when delivery changes and only shows a checkout to its owner', async () => {
    const { as } = await createShopper()
    const other = await createShopper({ email: 'other@example.com' })
    const { phoneRef } = await createStock()
    await as('post', '/api/cart/items').send(phoneRef)
    const started = await as('post', '/api/checkout').send({ source: 'cart' })

    const updated = await as('patch', `/api/checkout/${started.body._id}`).send({
      deliveryMethod: 'expedited',
    })
    const reloaded = await as('get', `/api/checkout/${started.body._id}`)
    const stranger = await other.as('get', `/api/checkout/${started.body._id}`)

    expect(updated.body.quote.shippingCents).toBe(999)
    expect(reloaded.body).toMatchObject({ deliveryMethod: 'expedited' })
    expect(stranger.status).toBe(404)
  })
})

describe('POST /api/checkout/:id/place', () => {
  it('creates a pending order, reserves stock, and creates one PaymentIntent for the total', async () => {
    const { as } = await createShopper()
    const { phone, phoneRef } = await createStock()

    const { checkout, placed } = await placeCartOrder(as, [{ ...phoneRef, qty: 2 }])

    expect(placed.status).toBe(200)
    expect(placed.body).toMatchObject({
      orderNumber: expect.stringMatching(/^112-/),
      clientSecret: expect.stringContaining('_secret_'),
    })
    const order = await Order.findOne({ orderNumber: placed.body.orderNumber })
    expect(order).toMatchObject({ status: 'pending_payment', totalCents: 4320 })
    expect(order.reservationExpiresAt).toBeInstanceOf(Date)
    expect(await stockOf(phone)).toBe(3)
    expect((await Checkout.findById(checkout.body._id)).status).toBe('completed')
    expect(fakeStripe.client.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 4320, currency: 'usd' }),
      { idempotencyKey: `pi-${order._id}` },
    )
  })

  it('returns the same order and PaymentIntent when placed twice', async () => {
    const { as } = await createShopper()
    const { phone, phoneRef } = await createStock()
    const { checkout, placed } = await placeCartOrder(as, [phoneRef])

    const again = await as('post', `/api/checkout/${checkout.body._id}/place`).send({
      expectedTotalCents: checkout.body.quote.totalCents,
    })

    expect(again.body).toEqual(placed.body)
    expect(await Order.countDocuments()).toBe(1)
    expect(await Payment.countDocuments()).toBe(1)
    expect(fakeStripe.client.paymentIntents.create).toHaveBeenCalledTimes(1)
    expect(await stockOf(phone)).toBe(4)
  })

  it('creates one order and one PaymentIntent for simultaneous double clicks', async () => {
    const { as } = await createShopper()
    const { phone, phoneRef } = await createStock()
    await as('post', '/api/cart/items').send(phoneRef)
    const checkout = await as('post', '/api/checkout').send({ source: 'cart' })
    const place = () =>
      as('post', `/api/checkout/${checkout.body._id}/place`).send({
        expectedTotalCents: checkout.body.quote.totalCents,
      })

    const results = await Promise.all([place(), place(), place()])

    expect(results.map((res) => res.status)).toEqual([200, 200, 200])
    expect(new Set(results.map((res) => res.body.orderNumber)).size).toBe(1)
    expect(new Set(results.map((res) => res.body.clientSecret)).size).toBe(1)
    expect(await Order.countDocuments()).toBe(1)
    expect(await Payment.countDocuments()).toBe(1)
    expect(fakeStripe.intents.size).toBe(1)
    expect(await stockOf(phone)).toBe(4)
  })

  it('returns price_changed with the new quote when a price changed, and writes nothing', async () => {
    const { as } = await createShopper()
    const { phone, phoneRef } = await createStock()
    await as('post', '/api/cart/items').send(phoneRef)
    const checkout = await as('post', '/api/checkout').send({ source: 'cart' })
    phone.variants[0].priceCents = 2500
    await phone.save()

    const res = await as('post', `/api/checkout/${checkout.body._id}/place`).send({
      expectedTotalCents: checkout.body.quote.totalCents,
    })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('price_changed')
    expect(res.body.details.quote.subtotalCents).toBe(2500)
    expect(await Order.countDocuments()).toBe(0)
    expect((await Checkout.findById(checkout.body._id)).status).toBe('open')
  })

  it('returns out_of_stock when stock ran out, and leaves stock and orders untouched', async () => {
    const { as } = await createShopper()
    const { phone, phoneRef } = await createStock()
    await as('post', '/api/cart/items').send({ ...phoneRef, qty: 3 })
    const checkout = await as('post', '/api/checkout').send({ source: 'cart' })
    await Product.updateOne({ _id: phone._id }, { $set: { 'variants.0.stock': 2 } })

    const res = await as('post', `/api/checkout/${checkout.body._id}/place`).send({
      expectedTotalCents: checkout.body.quote.totalCents,
    })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({ code: 'out_of_stock' })
    expect(res.body.details[0].message).toBe('Only 2 left in stock.')
    expect(await Order.countDocuments()).toBe(0)
    expect(await stockOf(phone)).toBe(2)
    expect(fakeStripe.client.paymentIntents.create).not.toHaveBeenCalled()
  })

  it('requires an address before placing', async () => {
    const { as } = await createShopper({ withAddress: false })
    const { phoneRef } = await createStock()

    const { placed } = await placeCartOrder(as, [phoneRef])

    expect(placed.status).toBe(409)
    expect(placed.body.code).toBe('address_required')
  })

  it('keeps the order when Stripe is down, and the payment-intent route recovers it', async () => {
    const { as } = await createShopper()
    const { phoneRef } = await createStock()
    fakeStripe.client.paymentIntents.create.mockRejectedValueOnce(new Error('Stripe is down'))

    const { placed } = await placeCartOrder(as, [phoneRef])
    const { orderNumber } = placed.body.details
    const retry = await as('post', `/api/orders/${orderNumber}/payment-intent`)

    expect(placed.status).toBe(502)
    expect(placed.body.code).toBe('payment_unavailable')
    expect(retry.status).toBe(200)
    expect(retry.body.clientSecret).toContain('_secret_')
    expect(await Payment.countDocuments()).toBe(1)
  })
})
