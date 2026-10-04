import { describe, expect, it } from 'vitest'
import { Product, Review } from '../models/index.js'
import { createCategoryTree, createProduct, productInput, variant } from './helpers.js'

describe('Product hooks', () => {
  it('calculates price, discount, and stock fields from active variants', async () => {
    const { category } = await createCategoryTree()
    const product = await createProduct(category, {
      variants: [
        variant({ label: '128 GB', priceCents: 50_000, listPriceCents: 60_000, stock: 2 }),
        variant({ label: '256 GB', priceCents: 60_000, stock: 0 }),
        variant({ label: '1 TB', priceCents: 90_000, stock: 9, isActive: false }),
      ],
    })

    expect(product).toMatchObject({
      minPriceCents: 50_000,
      maxPriceCents: 60_000,
      maxDiscountPercent: 17,
      totalStock: 2,
      inStock: true,
    })
  })

  it('is out of stock when no active variant has stock', async () => {
    const { category } = await createCategoryTree()
    const product = await createProduct(category, { variants: [variant({ stock: 0 })] })

    expect(product.inStock).toBe(false)
  })

  it('sets the department from the category parent', async () => {
    const { department, category } = await createCategoryTree()
    const product = await createProduct(category)

    expect(product.department.equals(department._id)).toBe(true)
  })

  it('rejects a department as the product category', async () => {
    const { department } = await createCategoryTree()

    await expect(createProduct(department)).rejects.toThrow(/not a department/)
  })

  it('keeps exactly one default variant, preferring one in stock', async () => {
    const { category } = await createCategoryTree()
    const product = await createProduct(category, {
      variants: [variant({ label: 'S', stock: 0 }), variant({ label: 'M', stock: 3 })],
    })

    expect(product.variants.map((v) => v.isDefault)).toEqual([false, true])

    product.variants[0].isDefault = true
    await product.save()
    expect(product.variants.filter((v) => v.isDefault)).toHaveLength(1)
  })

  it('generates a unique slug when none is given', async () => {
    const { category } = await createCategoryTree()
    const first = await createProduct(category)
    const second = await createProduct(category)

    expect(first.slug).toBe('test-phone')
    expect(second.slug).toBe('test-phone-2')
  })

  it('sets publishedAt the first time a product becomes active', async () => {
    const { category } = await createCategoryTree()
    const product = await createProduct(category, { status: 'draft' })
    expect(product.publishedAt).toBeNull()

    product.status = 'active'
    await product.save()
    expect(product.publishedAt).toBeInstanceOf(Date)
  })

  it('refuses to activate a product without images', async () => {
    const { category } = await createCategoryTree()

    await expect(createProduct(category, { images: [] })).rejects.toThrow(/at least 1 image/)
  })

  it('rejects a list price below the selling price', async () => {
    const { category } = await createCategoryTree()
    const input = productInput(category, {
      variants: [variant({ priceCents: 1000, listPriceCents: 900 })],
    })

    await expect(Product.create(input)).rejects.toThrow(/listPriceCents/)
  })
})

describe('Product.syncStockFields', () => {
  it('recalculates stock after an atomic $inc', async () => {
    const { category } = await createCategoryTree()
    const product = await createProduct(category, { variants: [variant({ stock: 1 })] })

    await Product.updateOne(
      { _id: product._id, 'variants._id': product.variants[0]._id },
      { $inc: { 'variants.$.stock': -1 } },
    )
    await Product.syncStockFields(product._id)

    const updated = await Product.findById(product._id).lean()
    expect(updated).toMatchObject({ totalStock: 0, inStock: false })
  })
})

describe('Product.syncRatingFields', () => {
  it('recalculates the rating fields from reviews', async () => {
    const { category } = await createCategoryTree()
    const product = await createProduct(category)
    await Review.insertMany(
      [5, 4, 4, 1].map((rating) => ({ product: product._id, authorName: 'A', rating, body: 'Ok' })),
    )

    await Product.syncRatingFields(product._id)

    const updated = await Product.findById(product._id).lean()
    expect(updated.ratingAvg).toBe(3.5)
    expect(updated.ratingCount).toBe(4)
    expect(updated.ratingBreakdown).toEqual({ 1: 1, 2: 0, 3: 0, 4: 2, 5: 1 })
  })
})
