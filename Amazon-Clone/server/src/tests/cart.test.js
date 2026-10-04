import request from 'supertest'
import { describe, expect, it } from 'vitest'
import app from '../app.js'
import { Cart, Product, User } from '../models/index.js'
import { removePurchasedItems } from '../services/cart.service.js'
import { AUTH_COOKIE, signToken } from '../utils/token.js'
import { createCategoryTree, createProduct, variant } from './helpers.js'

async function createUser(email = 'shopper@example.com') {
  const user = await User.create({ name: 'Shopper', email, passwordHash: 'not-used' })
  const cookie = `${AUTH_COOKIE}=${signToken(user._id)}`
  const as = (method, url) => request(app)[method](url).set('Cookie', cookie)
  return { user, as }
}

async function createCatalog() {
  const { category } = await createCategoryTree()
  const phone = await createProduct(category, {
    title: 'Pixel 9',
    variants: [
      variant({ label: '128 GB', priceCents: 3000, stock: 4 }),
      variant({ label: '256 GB', priceCents: 5000, stock: 0 }),
    ],
  })
  const case_ = await createProduct(category, { title: 'Phone Case', variants: [variant()] })
  const [small, soldOut] = phone.variants
  return {
    phone,
    small: { productId: String(phone._id), variantId: String(small._id) },
    soldOut: { productId: String(phone._id), variantId: String(soldOut._id) },
    case: { productId: String(case_._id), variantId: String(case_.variants[0]._id) },
  }
}

const line = (res, title) => res.body.items.find((item) => item.title === title)

describe('cart for signed-in users', () => {
  it('adds an item, and adding it again increases qty in the one cart document', async () => {
    const { user, as } = await createUser()
    const { small } = await createCatalog()

    await as('post', '/api/cart/items').send({ ...small, qty: 1 })
    const res = await as('post', '/api/cart/items').send({ ...small, qty: 2 })

    expect(res.status).toBe(201)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0]).toMatchObject({ qty: 3, variantLabel: '128 GB', priceCents: 3000 })
    expect(res.body).toMatchObject({ count: 3, itemCount: 3, subtotalCents: 9000 })
    expect(await Cart.countDocuments({ user: user._id })).toBe(1)
  })

  it('keeps both of two simultaneous adds and still creates only one cart', async () => {
    const { user, as } = await createUser()
    const { small, case: phoneCase } = await createCatalog()

    const results = await Promise.all([
      as('post', '/api/cart/items').send(small),
      as('post', '/api/cart/items').send(phoneCase),
    ])

    expect(results.map((res) => res.status)).toEqual([201, 201])
    const cart = await Cart.findOne({ user: user._id }).lean()
    expect(cart.items).toHaveLength(2)
    expect(await Cart.countDocuments({ user: user._id })).toBe(1)
  })

  it('caps qty at stock when adding', async () => {
    const { as } = await createUser()
    const { small } = await createCatalog()

    await as('post', '/api/cart/items').send({ ...small, qty: 3 })
    const res = await as('post', '/api/cart/items').send({ ...small, qty: 3 })

    expect(res.body.items[0].qty).toBe(4)
  })

  it('rejects unknown and sold-out variants with 409', async () => {
    const { as } = await createUser()
    const { small, soldOut } = await createCatalog()

    const unknown = await as('post', '/api/cart/items').send({
      productId: small.productId,
      variantId: '0123456789abcdef01234567',
    })
    const outOfStock = await as('post', '/api/cart/items').send(soldOut)

    expect(unknown.status).toBe(409)
    expect(unknown.body).toMatchObject({ code: 'unavailable', details: [expect.any(Object)] })
    expect(outOfStock.status).toBe(409)
    expect(outOfStock.body.code).toBe('out_of_stock')
  })

  it('returns line totals and the subtotal before discounts', async () => {
    const { as } = await createUser()
    const { phone, case: phoneCase } = await createCatalog()
    const sale = await createProduct(
      { _id: phone.category },
      {
        title: 'Sale Phone',
        variants: [variant({ priceCents: 4000, listPriceCents: 5000, stock: 9 })],
      },
    )
    await as('post', '/api/cart/items').send({
      productId: String(sale._id),
      variantId: String(sale.variants[0]._id),
      qty: 3,
    })

    const res = await as('post', '/api/cart/items').send({ ...phoneCase, qty: 2 })

    expect(line(res, 'Sale Phone')).toMatchObject({
      priceCents: 4000,
      listPriceCents: 5000,
      lineTotalCents: 12000,
      listLineTotalCents: 15000,
    })
    expect(line(res, 'Phone Case')).toMatchObject({
      lineTotalCents: 2000,
      listLineTotalCents: 2000,
    })
    expect(res.body).toMatchObject({
      subtotalCents: 14000,
      listSubtotalCents: 17000,
      savingsCents: 3000,
    })
  })

  it('leaves saved-for-later items out of the subtotal and count', async () => {
    const { as } = await createUser()
    const { small, case: phoneCase } = await createCatalog()
    await as('post', '/api/cart/items').send({ ...small, qty: 2 })
    const added = await as('post', '/api/cart/items').send(phoneCase)

    const res = await as('patch', `/api/cart/items/${line(added, 'Phone Case')._id}`).send({
      savedForLater: true,
    })

    expect(line(res, 'Phone Case').savedForLater).toBe(true)
    expect(res.body).toMatchObject({ count: 2, itemCount: 2, subtotalCents: 6000 })
  })

  it('updates qty, but not past stock', async () => {
    const { as } = await createUser()
    const { small } = await createCatalog()
    const added = await as('post', '/api/cart/items').send(small)
    const itemId = added.body.items[0]._id

    const updated = await as('patch', `/api/cart/items/${itemId}`).send({ qty: 4 })
    const tooMany = await as('patch', `/api/cart/items/${itemId}`).send({ qty: 5 })

    expect(updated.body.items[0].qty).toBe(4)
    expect(tooMany.status).toBe(409)
    expect(tooMany.body).toMatchObject({ code: 'insufficient_stock' })
  })

  it('deletes the cart document when the last item is removed', async () => {
    const { user, as } = await createUser()
    const { small } = await createCatalog()
    const added = await as('post', '/api/cart/items').send(small)

    const res = await as('delete', `/api/cart/items/${added.body.items[0]._id}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ items: [], count: 0, subtotalCents: 0 })
    expect(await Cart.exists({ user: user._id })).toBeNull()
  })

  it('returns the same cart on every request, and 404 for another user’s item', async () => {
    const owner = await createUser()
    const other = await createUser('other@example.com')
    const { small } = await createCatalog()
    const added = await owner.as('post', '/api/cart/items').send(small)

    const again = await owner.as('get', '/api/cart')
    const stolen = await other.as('delete', `/api/cart/items/${added.body.items[0]._id}`)

    expect(again.body.items).toHaveLength(1)
    expect(stolen.status).toBe(404)
  })

  it('flags price changes and items that became unavailable', async () => {
    const { as } = await createUser()
    const { phone, small, case: phoneCase } = await createCatalog()
    await as('post', '/api/cart/items').send(small)
    await as('post', '/api/cart/items').send(phoneCase)
    phone.variants[0].priceCents = 3500
    await phone.save()
    await Product.updateOne({ _id: phoneCase.productId }, { status: 'archived' })

    const res = await as('get', '/api/cart')

    expect(line(res, 'Pixel 9')).toMatchObject({ priceChanged: true, addedPriceCents: 3000 })
    expect(line(res, 'Phone Case')).toMatchObject({ unavailable: true, slug: null })
    expect(res.body).toMatchObject({ count: 2, itemCount: 1, subtotalCents: 3500 })
  })

  it('requires sign in and validates input', async () => {
    const { as } = await createUser()

    const guest = await request(app).get('/api/cart')
    const badQty = await as('post', '/api/cart/items').send({
      productId: '0123456789abcdef01234567',
      variantId: '0123456789abcdef01234567',
      qty: 31,
    })
    const badId = await as('patch', '/api/cart/items/nope').send({ qty: 1 })
    const empty = await as('patch', '/api/cart/items/0123456789abcdef01234567').send({})

    expect(guest.status).toBe(401)
    expect([badQty.status, badId.status, empty.status]).toEqual([400, 400, 400])
  })
})

describe('POST /api/cart/merge', () => {
  it('adds guest quantities to matching items, capped at stock, and skips sold-out items', async () => {
    const { as } = await createUser()
    const { small, soldOut, case: phoneCase } = await createCatalog()
    await as('post', '/api/cart/items').send({ ...small, qty: 2 })

    const res = await as('post', '/api/cart/merge').send({
      items: [
        { ...small, qty: 3 },
        { ...soldOut, qty: 1 },
        { ...phoneCase, qty: 2, savedForLater: true },
      ],
    })

    expect(res.status).toBe(200)
    expect(line(res, 'Pixel 9').qty).toBe(4)
    expect(line(res, 'Phone Case')).toMatchObject({ qty: 2, savedForLater: true })
    expect(res.body.items).toHaveLength(2)
  })
})

describe('POST /api/cart/preview', () => {
  it('hydrates guest items without writing a cart', async () => {
    const { small } = await createCatalog()

    const res = await request(app)
      .post('/api/cart/preview')
      .send({ items: [{ ...small, qty: 2, addedPriceCents: 2500 }] })

    expect(res.status).toBe(200)
    expect(res.body.items[0]).toMatchObject({
      _id: small.variantId,
      title: 'Pixel 9',
      qty: 2,
      priceChanged: true,
    })
    expect(res.body.subtotalCents).toBe(6000)
    expect(await Cart.countDocuments()).toBe(0)
  })
})

describe('removePurchasedItems', () => {
  it('removes bought items, keeps saved ones, and deletes the cart once it is empty', async () => {
    const { user, as } = await createUser()
    const { small, case: phoneCase } = await createCatalog()
    await as('post', '/api/cart/items').send(small)
    const added = await as('post', '/api/cart/items').send(phoneCase)
    await as('patch', `/api/cart/items/${line(added, 'Phone Case')._id}`).send({
      savedForLater: true,
    })

    await removePurchasedItems(user._id, [small.variantId, phoneCase.variantId])
    const kept = await Cart.findOne({ user: user._id }).lean()
    await as('delete', `/api/cart/items/${kept.items[0]._id}`)

    expect(kept.items).toHaveLength(1)
    expect(kept.items[0].savedForLater).toBe(true)
    expect(await Cart.exists({ user: user._id })).toBeNull()
  })

  it('deletes the cart when every item was bought', async () => {
    const { user, as } = await createUser()
    const { small } = await createCatalog()
    await as('post', '/api/cart/items').send(small)

    await removePurchasedItems(user._id, [small.variantId])

    expect(await Cart.exists({ user: user._id })).toBeNull()
  })
})
