import request from 'supertest'
import { describe, expect, it } from 'vitest'
import app from '../app.js'
import { Category, Review } from '../models/index.js'
import { createCategoryTree, createProduct, variant } from './helpers.js'

async function createPhone(category, overrides = {}) {
  return createProduct(category, {
    title: 'Pixel 9',
    optionName: 'Storage',
    variants: [
      variant({ label: '128 GB', priceCents: 3000, stock: 4, isDefault: true }),
      variant({ label: '256 GB', priceCents: 5000, listPriceCents: 6000, stock: 0 }),
      variant({ label: '1 TB', priceCents: 9000, stock: 2, isActive: false }),
    ],
    ...overrides,
  })
}

function createReviews(product, count) {
  const firstDay = Date.UTC(2026, 0, 1)
  return Review.insertMany(
    Array.from({ length: count }, (_, i) => ({
      product: product._id,
      authorName: `Reviewer ${i + 1}`,
      rating: (i % 5) + 1,
      body: `Review ${i + 1}`,
      createdAt: new Date(firstDay + i * 86_400_000),
    })),
  )
}

describe('GET /api/products/:slug', () => {
  it('returns the product with only active variants, delivery, and breadcrumbs', async () => {
    const { category } = await createCategoryTree()
    await createPhone(category)

    const res = await request(app).get('/api/products/pixel-9')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ slug: 'pixel-9', title: 'Pixel 9', optionName: 'Storage' })
    expect(res.body.variants.map((item) => item.label)).toEqual(['128 GB', '256 GB'])
    expect(res.body.variants[0]).toMatchObject({ stock: 4, isDefault: true, discountPercent: 0 })
    expect(res.body.variants[0].delivery.shippingCents).toBe(599)
    expect(res.body.variants[1]).toMatchObject({ listPriceCents: 6000, discountPercent: 17 })
    expect(res.body.variants[1].delivery.shippingCents).toBe(0)
    expect(res.body.breadcrumbs).toEqual([
      { name: 'Electronics', slug: 'electronics' },
      { name: 'Smartphones', slug: 'smartphones' },
    ])
    expect(res.body.source).toBeUndefined()
    expect(res.body.variants[0].sku).toBeUndefined()
  })

  it.each([
    ['a missing slug', null],
    ['a draft', { status: 'draft' }],
    ['an archived product', { status: 'archived' }],
  ])('returns 404 for %s', async (_case, overrides) => {
    const { category } = await createCategoryTree()
    if (overrides) await createPhone(category, overrides)

    const res = await request(app).get('/api/products/pixel-9')

    expect(res.status).toBe(404)
    expect(res.body.code).toBe('product_not_found')
  })

  it('returns 404 for a product in a hidden category', async () => {
    const { category } = await createCategoryTree()
    await createPhone(category)
    await Category.updateOne({ _id: category._id }, { isActive: false })

    const res = await request(app).get('/api/products/pixel-9')

    expect(res.status).toBe(404)
  })

  it('rejects an invalid slug and unknown query params', async () => {
    const badSlug = await request(app).get('/api/products/Bad%20Slug!')
    const unknownParam = await request(app).get('/api/products/pixel-9?v=1')

    expect(badSlug.status).toBe(400)
    expect(unknownParam.status).toBe(400)
  })
})

describe('GET /api/products/:slug/reviews', () => {
  it('paginates 10 per page, newest first', async () => {
    const { category } = await createCategoryTree()
    const phone = await createPhone(category)
    await createReviews(phone, 12)

    const first = await request(app).get('/api/products/pixel-9/reviews')
    const second = await request(app).get('/api/products/pixel-9/reviews').query({ page: 2 })

    expect(first.status).toBe(200)
    expect(first.body).toMatchObject({ total: 12, page: 1, pages: 2 })
    expect(first.body.items).toHaveLength(10)
    expect(first.body.items[0].authorName).toBe('Reviewer 12')
    expect(second.body.items.map((review) => review.authorName)).toEqual([
      'Reviewer 2',
      'Reviewer 1',
    ])
  })

  it('sorts top reviews by rating, then newest', async () => {
    const { category } = await createCategoryTree()
    const phone = await createPhone(category)
    await createReviews(phone, 6)

    const res = await request(app).get('/api/products/pixel-9/reviews').query({ sort: 'top' })

    expect(res.body.items.map((review) => review.rating)).toEqual([5, 4, 3, 2, 1, 1])
    expect(res.body.items[4].authorName).toBe('Reviewer 6')
  })

  it('returns 404 for a hidden product and 400 for invalid params', async () => {
    const { category } = await createCategoryTree()
    await createPhone(category, { status: 'draft' })

    const hidden = await request(app).get('/api/products/pixel-9/reviews')
    const invalid = await request(app).get('/api/products/pixel-9/reviews').query({ sort: 'best' })

    expect(hidden.status).toBe(404)
    expect(invalid.status).toBe(400)
  })
})

describe('GET /api/products/:slug/related', () => {
  it('returns best sellers from the same category, without the product itself', async () => {
    const { department, category } = await createCategoryTree()
    const tablets = await Category.create({
      name: 'Tablets',
      slug: 'tablets',
      parent: department._id,
    })
    await createPhone(category)
    await createProduct(category, { title: 'Galaxy S24', salesCount: 5 })
    await createProduct(category, { title: 'iPhone 16', salesCount: 9 })
    await createProduct(category, { title: 'Draft Phone', status: 'draft' })
    await createProduct(tablets, { title: 'iPad Air', salesCount: 50 })

    const res = await request(app).get('/api/products/pixel-9/related')

    expect(res.status).toBe(200)
    expect(res.body.map((product) => product.title)).toEqual(['iPhone 16', 'Galaxy S24'])
    expect(res.body[0]).toHaveProperty('priceCents', 1000)
  })
})
