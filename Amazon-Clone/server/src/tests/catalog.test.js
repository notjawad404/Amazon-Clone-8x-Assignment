import request from 'supertest'
import { describe, expect, it } from 'vitest'
import app from '../app.js'
import mongoose from 'mongoose'
import { Category, Product } from '../models/index.js'
import { createProduct, variant } from './helpers.js'

async function createCatalog() {
  const electronics = await Category.create({
    name: 'Electronics',
    slug: 'electronics',
    sortOrder: 1,
  })
  const fashion = await Category.create({ name: 'Fashion', slug: 'fashion', sortOrder: 0 })
  const laptops = await Category.create({
    name: 'Laptops',
    slug: 'laptops',
    parent: electronics._id,
    sortOrder: 1,
  })
  const phones = await Category.create({
    name: 'Smartphones',
    slug: 'smartphones',
    parent: electronics._id,
    sortOrder: 0,
  })
  const shoes = await Category.create({ name: 'Shoes', slug: 'shoes', parent: fashion._id })
  return { electronics, fashion, laptops, phones, shoes }
}

function image(name) {
  return {
    url: `https://res.cloudinary.com/demo/image/upload/${name}.jpg`,
    publicId: name,
    alt: name,
  }
}

describe('GET /api/categories', () => {
  it('returns departments with their categories, sorted, with a cache header', async () => {
    await createCatalog()

    const res = await request(app).get('/api/categories')

    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toBe('public, max-age=300')
    expect(res.body.map((department) => department.slug)).toEqual(['fashion', 'electronics'])
    expect(res.body[1].children.map((category) => category.slug)).toEqual([
      'smartphones',
      'laptops',
    ])
  })

  it('hides inactive categories and every category of an inactive department', async () => {
    const { fashion, laptops } = await createCatalog()
    await Category.updateMany(
      { _id: mongoose.trusted({ $in: [fashion._id, laptops._id] }) },
      { isActive: false },
    )

    const res = await request(app).get('/api/categories')

    expect(res.body).toHaveLength(1)
    expect(res.body[0].children.map((category) => category.slug)).toEqual(['smartphones'])
  })

  it("falls back to the best-selling product's image when a category has none", async () => {
    const { phones } = await createCatalog()
    await createProduct(phones, { title: 'Slow Seller', images: [image('slow')], salesCount: 1 })
    await createProduct(phones, { title: 'Top Seller', images: [image('top')], salesCount: 50 })

    const res = await request(app).get('/api/categories')

    const electronics = res.body.find((department) => department.slug === 'electronics')
    expect(electronics.children[0].image).toEqual({ url: image('top').url, alt: 'top' })
    expect(electronics.image).toEqual(electronics.children[0].image)
    expect(electronics.children[1].image).toBeNull()
  })
})

describe('GET /api/products/home', () => {
  it('returns the home rows with only the card fields and a cache header', async () => {
    const { phones } = await createCatalog()
    await createProduct(phones, {
      title: 'Deal Phone',
      variants: [
        variant({ label: '128 GB', priceCents: 8000, listPriceCents: 10000 }),
        variant({ label: '256 GB', priceCents: 9000, listPriceCents: 10000 }),
      ],
    })

    const res = await request(app).get('/api/products/home')

    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toBe('public, max-age=300')
    expect(res.body.bestSellers).toHaveLength(1)
    expect(res.body.bestSellers[0]).toEqual({
      _id: expect.any(String),
      slug: 'deal-phone',
      title: 'Deal Phone',
      brand: 'Generic',
      image: { url: expect.stringContaining('phone.jpg'), alt: '' },
      priceCents: 8000,
      listPriceCents: 10000,
      discountPercent: 20,
      ratingAvg: 0,
      ratingCount: 0,
      inStock: true,
    })
  })

  it('sorts best sellers, new arrivals, and top rated by their own field', async () => {
    const { phones, shoes } = await createCatalog()
    const older = await createProduct(phones, { title: 'Older Popular', salesCount: 90 })
    await Product.updateOne({ _id: older._id }, { publishedAt: new Date('2025-01-01') })
    await createProduct(phones, { title: 'Newer Niche', salesCount: 1, ratingAvg: 4.9 })
    await createProduct(shoes, { title: 'Running Shoe', ratingAvg: 3 })

    const { body } = await request(app).get('/api/products/home')

    expect(body.bestSellers[0].title).toBe('Older Popular')
    expect(body.newArrivals.at(-1).title).toBe('Older Popular')
    expect(body.topRated.map((row) => row.department.slug)).toEqual(['fashion', 'electronics'])
    expect(body.topRated[1].products.map((product) => product.title)).toEqual([
      'Newer Niche',
      'Older Popular',
    ])
  })

  it('lists only products discounted at least 10% as deals', async () => {
    const { phones } = await createCatalog()
    await createProduct(phones, {
      title: 'Small Discount',
      variants: [variant({ priceCents: 9500, listPriceCents: 10000 })],
    })
    await createProduct(phones, {
      title: 'Big Discount',
      variants: [variant({ priceCents: 7000, listPriceCents: 10000 })],
    })

    const { body } = await request(app).get('/api/products/home')

    expect(body.deals.map((product) => product.title)).toEqual(['Big Discount'])
  })

  it('leaves out draft, archived, and hidden-category products', async () => {
    const { phones, laptops } = await createCatalog()
    await createProduct(phones, { title: 'Visible Phone' })
    await createProduct(phones, { title: 'Draft Phone', status: 'draft' })
    await createProduct(phones, { title: 'Archived Phone', status: 'archived' })
    await createProduct(laptops, { title: 'Hidden Laptop' })
    await Category.updateOne({ _id: laptops._id }, { isActive: false })

    const { body } = await request(app).get('/api/products/home')

    expect(body.bestSellers.map((product) => product.title)).toEqual(['Visible Phone'])
    expect(body.topRated).toHaveLength(1)
  })

  it('returns empty rows for an empty catalog', async () => {
    const res = await request(app).get('/api/products/home')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ bestSellers: [], newArrivals: [], deals: [], topRated: [] })
  })
})
