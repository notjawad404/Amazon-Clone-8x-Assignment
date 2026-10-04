import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import app from '../app.js'
import { Category, Product } from '../models/index.js'
import { buildSearchQuery } from '../services/search.service.js'
import { collectTerms } from '../services/suggestion.service.js'
import { createProduct } from './helpers.js'

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
  ])('rejects invalid params %j with 400', async (params) => {
    const res = await request(app).get('/api/products').query(params)

    expect(res.status).toBe(400)
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
