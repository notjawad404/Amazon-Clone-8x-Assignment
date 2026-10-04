import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import app from '../app.js'
import { Category, Product } from '../models/index.js'
import { buildSearchQuery } from '../services/search.service.js'
import { collectTerms } from '../services/suggestion.service.js'
import { createCategoryTree, createProduct, variant } from './helpers.js'

beforeAll(async () => {
  await Product.createIndexes()
})

async function createCatalog() {
  const electronics = await Category.create({ name: 'Electronics', slug: 'electronics' })
  const fashion = await Category.create({ name: 'Fashion', slug: 'fashion' })
  const phones = await Category.create({
    name: 'Smartphones',
    slug: 'smartphones',
    parent: electronics._id,
  })
  const laptops = await Category.create({
    name: 'Laptops',
    slug: 'laptops',
    parent: electronics._id,
  })
  const watches = await Category.create({
    name: "Men's Watches",
    slug: 'mens-watches',
    parent: fashion._id,
  })

  await createProduct(phones, {
    title: 'iPhone 13 Pro',
    brand: 'Apple',
    tags: ['smartphones', 'apple'],
    salesCount: 30,
  })
  await createProduct(phones, { title: 'Galaxy S21', brand: 'Samsung', salesCount: 20 })
  await createProduct(laptops, {
    title: 'MacBook Pro Laptop',
    brand: 'Apple',
    tags: ['laptops'],
    salesCount: 10,
  })
  await createProduct(watches, { title: 'Rolex Submariner Watch', brand: 'Rolex', salesCount: 5 })
  await createProduct(phones, { title: 'Smart Watch Phone', status: 'draft' })
  return { electronics, fashion, phones, laptops, watches }
}

const titles = (res) => res.body.items.map((item) => item.title)

describe('buildSearchQuery', () => {
  const visibleCategoryIds = ['c1']

  it('sorts by best sellers when there is no query', () => {
    const { filter, sort } = buildSearchQuery({ visibleCategoryIds })

    expect(filter.$text).toBeUndefined()
    expect(sort).toEqual({ salesCount: -1, _id: 1 })
  })

  it('uses text search and sorts by relevance when there is a query', () => {
    const { filter, sort } = buildSearchQuery({ q: 'phone', visibleCategoryIds })

    expect(filter.$text).toMatchObject({ $search: 'phone' })
    expect(sort.score).toEqual({ $meta: 'textScore' })
  })

  it('filters a department by department and a category by category', () => {
    const department = buildSearchQuery({ scope: { _id: 'd1', level: 0 }, visibleCategoryIds })
    const category = buildSearchQuery({ scope: { _id: 'c1', level: 1 }, visibleCategoryIds })

    expect(department.filter.department).toBe('d1')
    expect(category.filter.category).toBe('c1')
  })

  it('converts the price range to cents and leaves brand out of the facet filter', () => {
    const { filter, facetFilter } = buildSearchQuery({
      visibleCategoryIds,
      minPrice: 25,
      maxPrice: 49.99,
      brand: ['Apple'],
    })

    expect(filter.minPriceCents).toMatchObject({ $gte: 2500, $lte: 4999 })
    expect(filter.brand).toMatchObject({ $in: ['Apple'] })
    expect(facetFilter.brand).toBeUndefined()
    expect(facetFilter.minPriceCents).toBe(filter.minPriceCents)
  })

  it('sorts by the chosen field instead of relevance, even with a query', () => {
    const { sort, projection } = buildSearchQuery({
      q: 'phone',
      sort: 'price_desc',
      visibleCategoryIds,
    })

    expect(sort).toEqual({ minPriceCents: -1, _id: 1 })
    expect(projection).toEqual({})
  })
})

describe('GET /api/products', () => {
  it('finds a product by text search', async () => {
    await createCatalog()

    const res = await request(app).get('/api/products').query({ q: 'iPhone' })

    expect(res.status).toBe(200)
    expect(titles(res)).toEqual(['iPhone 13 Pro'])
    expect(res.body).toMatchObject({ total: 1, page: 1, pages: 1, category: null })
  })

  it('filters by department and by category', async () => {
    await createCatalog()

    const department = await request(app).get('/api/products').query({ category: 'electronics' })
    const category = await request(app).get('/api/products').query({ category: 'laptops' })

    expect(titles(department)).toEqual(['iPhone 13 Pro', 'Galaxy S21', 'MacBook Pro Laptop'])
    expect(department.body.category).toMatchObject({ slug: 'electronics', level: 0 })
    expect(titles(category)).toEqual(['MacBook Pro Laptop'])
    expect(category.body.category.department).toMatchObject({ slug: 'electronics' })
  })

  it('combines text search with a department', async () => {
    await createCatalog()

    const res = await request(app).get('/api/products').query({ q: 'watch', category: 'fashion' })

    expect(titles(res)).toEqual(['Rolex Submariner Watch'])
  })

  it('leaves out drafts and products in hidden categories', async () => {
    const { laptops } = await createCatalog()
    await Category.updateOne({ _id: laptops._id }, { isActive: false })

    const res = await request(app).get('/api/products')

    expect(titles(res)).toEqual(['iPhone 13 Pro', 'Galaxy S21', 'Rolex Submariner Watch'])
  })

  it('paginates', async () => {
    await createCatalog()

    const res = await request(app).get('/api/products').query({ limit: 2, page: 2 })

    expect(titles(res)).toEqual(['MacBook Pro Laptop', 'Rolex Submariner Watch'])
    expect(res.body).toMatchObject({ total: 4, page: 2, pages: 2 })
  })

  it('returns 404 for an unknown category', async () => {
    const res = await request(app).get('/api/products').query({ category: 'nope' })

    expect(res.status).toBe(404)
    expect(res.body.code).toBe('category_not_found')
  })

  it.each([
    [{ page: 0 }],
    [{ limit: 49 }],
    [{ q: 'x'.repeat(101) }],
    [{ category: 'Bad Slug!' }],
    [{ sort: 'price' }],
    [{ minPrice: -1 }],
    [{ minPrice: 50, maxPrice: 20 }],
    [{ rating: 5 }],
    [{ inStock: 'yes' }],
  ])('rejects invalid params %j with 400', async (params) => {
    const res = await request(app).get('/api/products').query(params)

    expect(res.status).toBe(400)
  })
})

async function createListing() {
  const { category } = await createCategoryTree()
  const listed = (title, brand, priceCents, stock, ratingAvg, publishedAt) =>
    createProduct(category, {
      title,
      brand,
      ratingAvg,
      publishedAt: new Date(publishedAt),
      variants: [variant({ priceCents, stock })],
    })

  await listed('Budget Phone', 'Acme', 1500, 5, 3.2, '2026-01-01')
  await listed('Mid Phone', 'Apple', 4000, 0, 4.1, '2026-03-01')
  await listed('Pro Phone', 'Apple', 9000, 2, 4.8, '2026-02-01')
  await listed('Max Phone', 'Samsung', 20000, 9, 4.5, '2026-04-01')
}

const listing = (queryString) => request(app).get(`/api/products?sort=price_asc&${queryString}`)

describe('GET /api/products filters', () => {
  it.each([
    ['minPrice=40', ['Mid Phone', 'Pro Phone', 'Max Phone']],
    ['maxPrice=90', ['Budget Phone', 'Mid Phone', 'Pro Phone']],
    ['minPrice=20&maxPrice=90', ['Mid Phone', 'Pro Phone']],
    ['rating=4', ['Mid Phone', 'Pro Phone', 'Max Phone']],
    ['brand=Apple', ['Mid Phone', 'Pro Phone']],
    ['brand=Apple&brand=Samsung', ['Mid Phone', 'Pro Phone', 'Max Phone']],
    ['inStock=true', ['Budget Phone', 'Pro Phone', 'Max Phone']],
    ['inStock=false', ['Budget Phone', 'Mid Phone', 'Pro Phone', 'Max Phone']],
    ['rating=4&maxPrice=100&inStock=true&brand=Apple', ['Pro Phone']],
  ])('filters by %s', async (queryString, expected) => {
    await createListing()

    const res = await listing(queryString)

    expect(res.status).toBe(200)
    expect(titles(res)).toEqual(expected)
    expect(res.body.total).toBe(expected.length)
  })

  it.each([
    ['price_asc', ['Budget Phone', 'Mid Phone', 'Pro Phone', 'Max Phone']],
    ['price_desc', ['Max Phone', 'Pro Phone', 'Mid Phone', 'Budget Phone']],
    ['rating', ['Pro Phone', 'Max Phone', 'Mid Phone', 'Budget Phone']],
    ['newest', ['Max Phone', 'Mid Phone', 'Pro Phone', 'Budget Phone']],
  ])('sorts by %s', async (sort, expected) => {
    await createListing()

    const res = await request(app).get('/api/products').query({ sort })

    expect(titles(res)).toEqual(expected)
  })

  it('returns the last partial page and an empty page past the end', async () => {
    await createListing()

    const last = await listing('limit=3&page=2')
    const pastEnd = await listing('limit=3&page=3')

    expect(titles(last)).toEqual(['Max Phone'])
    expect(last.body).toMatchObject({ total: 4, page: 2, pages: 2 })
    expect(pastEnd.status).toBe(200)
    expect(pastEnd.body).toMatchObject({ items: [], total: 4, page: 3, pages: 2 })
  })

  it('counts brands without applying the brand filter', async () => {
    await createListing()

    const res = await listing('brand=Samsung')

    expect(titles(res)).toEqual(['Max Phone'])
    expect(res.body.facets.brands).toEqual([
      { name: 'Apple', count: 2 },
      { name: 'Acme', count: 1 },
      { name: 'Samsung', count: 1 },
    ])
  })

  it('applies the other filters to the brand counts', async () => {
    await createListing()

    const res = await listing('rating=4&inStock=true')

    expect(res.body.facets.brands).toEqual([
      { name: 'Apple', count: 1 },
      { name: 'Samsung', count: 1 },
    ])
  })

  it('adds stock and a free delivery date only from the free shipping threshold', async () => {
    await createListing()

    const res = await listing('')
    const [budget, mid] = res.body.items

    expect(budget).toMatchObject({ totalStock: 5, freeDeliveryDate: null })
    expect(mid.totalStock).toBe(0)
    expect(new Date(mid.freeDeliveryDate).getTime()).toBeGreaterThan(Date.now())
  })
})

describe('GET /api/products/suggestions', () => {
  it('suggests terms, categories, and products from the start of a word', async () => {
    await createCatalog()

    const res = await request(app).get('/api/products/suggestions').query({ q: 'iph' })

    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toBe('public, max-age=60')
    expect(res.body.terms).toEqual(['iphone 13 pro'])
    expect(res.body.products).toEqual([
      expect.objectContaining({ title: 'iPhone 13 Pro', slug: 'iphone-13-pro', priceCents: 1000 }),
    ])
  })

  it('matches categories and departments by name', async () => {
    await createCatalog()

    const laptops = await request(app).get('/api/products/suggestions').query({ q: 'lap' })
    const fashion = await request(app).get('/api/products/suggestions').query({ q: 'fash' })

    expect(laptops.body.categories).toEqual([
      expect.objectContaining({ name: 'Laptops', slug: 'laptops', department: 'Electronics' }),
    ])
    expect(fashion.body.categories).toEqual([
      expect.objectContaining({ slug: 'fashion', department: null }),
    ])
  })

  it('stays inside the selected department', async () => {
    await createCatalog()

    const res = await request(app)
      .get('/api/products/suggestions')
      .query({ q: 'watch', category: 'electronics' })

    expect(res.body.products).toEqual([])
    expect(res.body.categories).toEqual([])
  })

  it('treats regex characters as plain text', async () => {
    await createCatalog()

    const res = await request(app).get('/api/products/suggestions').query({ q: '(.*' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ terms: [], categories: [], products: [] })
  })

  it('rejects an empty query', async () => {
    const res = await request(app).get('/api/products/suggestions').query({ q: '  ' })

    expect(res.status).toBe(400)
  })
})

describe('collectTerms', () => {
  const product = (overrides) => ({ title: '', brand: 'Generic', tags: [], ...overrides })

  it('takes the matched word plus the next words, lowercased and unique', () => {
    const terms = collectTerms(
      [
        product({ title: 'Apple iPhone 13 Pro Max', brand: 'Apple' }),
        product({ title: 'iPhone 13 Pro Max Case' }),
      ],
      'iph',
    )

    expect(terms).toEqual(['iphone 13 pro'])
  })

  it('uses brands and tags, but not the default brand', () => {
    const terms = collectTerms(
      [
        product({ title: 'Gel Pen', brand: 'Generic', tags: ['gel pens'] }),
        product({ brand: 'Gelato Co' }),
      ],
      'gel',
    )

    expect(terms).toEqual(['gel pens', 'gel pen', 'gelato co'])
  })

  it('drops filler words at the end of a term', () => {
    expect(collectTerms([product({ title: 'Watch Gold for Women' })], 'wat')).toEqual([
      'watch gold',
    ])
  })

  it('stops at the limit', () => {
    const products = ['Red A', 'Red B', 'Red C'].map((title) => product({ title }))

    expect(collectTerms(products, 'red', 2)).toEqual(['red a', 'red b'])
  })

  it('does not match inside a word', () => {
    expect(collectTerms([product({ title: 'Shared Cup' })], 'red')).toEqual([])
  })
})
