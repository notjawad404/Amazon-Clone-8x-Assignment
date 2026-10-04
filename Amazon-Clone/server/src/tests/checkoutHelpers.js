import request from 'supertest'
import app from '../app.js'
import { env } from '../config/env.js'
import { Category, City, Country, User } from '../models/index.js'
import { AUTH_COOKIE, signToken } from '../utils/token.js'
import { createProduct, variant } from './helpers.js'
import { fakeStripe } from './stripeFake.js'

export const ADDRESS = {
  fullName: 'Jane Doe',
  line1: '1 Main St',
  city: 'Nashville',
  state: 'TN',
  zip: '37217',
  country: 'US',
  phone: '615-555-0100',
}

export async function createLocations() {
  await Country.create([
    {
      code: 'US',
      name: 'United States',
      states: [
        { code: 'TN', name: 'Tennessee' },
        { code: 'WA', name: 'Washington' },
      ],
    },
    { code: 'CA', name: 'Canada', states: [{ code: 'ON', name: 'Ontario' }] },
    { code: 'AQ', name: 'Antarctica', states: [] },
  ])
  await City.create([
    { country: 'US', state: 'Tennessee', name: 'Nashville' },
    { country: 'US', state: 'Tennessee', name: 'Memphis' },
    { country: 'CA', state: 'Ontario', name: 'Toronto' },
  ])
}

export async function createShopper({ email = 'shopper@example.com', withAddress = true } = {}) {
  const user = await User.create({
    name: 'Shopper',
    email,
    passwordHash: 'not-used',
    addresses: withAddress ? [{ ...ADDRESS, isDefault: true }] : [],
  })
  const cookie = `${AUTH_COOKIE}=${signToken(user._id)}`
  const as = (method, url) => request(app)[method](url).set('Cookie', cookie)
  return { user, as }
}

export async function createStock() {
  const department = await Category.create({ name: 'Electronics', slug: 'electronics' })
  const category = await Category.create({
    name: 'Smartphones',
    slug: 'smartphones',
    parent: department._id,
  })
  const phone = await createProduct(category, {
    title: 'Pixel 9',
    variants: [variant({ priceCents: 2000, stock: 5 })],
  })
  const charger = await createProduct(category, {
    title: 'Charger',
    variants: [variant({ priceCents: 1500, stock: 3 })],
  })
  const ref = (product) => ({
    productId: String(product._id),
    variantId: String(product.variants[0]._id),
  })
  return { phone, charger, phoneRef: ref(phone), chargerRef: ref(charger) }
}

// Fills the cart, starts a checkout, and places it. Returns the API responses.
export async function placeCartOrder(as, items) {
  for (const item of items) await as('post', '/api/cart/items').send(item)
  const checkout = await as('post', '/api/checkout').send({ source: 'cart' })
  const placed = await as('post', `/api/checkout/${checkout.body._id}/place`).send({
    expectedTotalCents: checkout.body.quote.totalCents,
  })
  return { checkout, placed }
}

export function sendStripeEvent(event) {
  const payload = JSON.stringify({ livemode: false, ...event })
  const signature = fakeStripe.client.webhooks.generateTestHeaderString({
    payload,
    secret: env.STRIPE_WEBHOOK_SECRET,
  })
  return request(app)
    .post('/api/webhooks/stripe')
    .set('Content-Type', 'application/json')
    .set('stripe-signature', signature)
    .send(payload)
}

export function succeededEvent(intent, { id = 'evt_succeeded_1', amount = intent.amount } = {}) {
  return {
    id,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: intent.id,
        amount_received: amount,
        currency: intent.currency,
        latest_charge: {
          id: 'ch_test_1',
          receipt_url: 'https://pay.stripe.com/receipts/test',
          payment_method_details: {
            card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2030, country: 'US' },
          },
        },
      },
    },
  }
}
