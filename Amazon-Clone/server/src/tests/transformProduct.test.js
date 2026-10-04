import { describe, expect, it } from 'vitest'
import { listPriceFor, toCents, transformProduct } from '../seed/transformProduct.js'

function sourceProduct(overrides = {}) {
  return {
    id: 1,
    title: 'Essence Mascara Lash Princess',
    description: 'A popular mascara. Long lasting!',
    category: 'beauty',
    price: 9.99,
    discountPercentage: 10.48,
    rating: 2.56,
    stock: 99,
    tags: ['beauty', 'mascara'],
    brand: 'Essence',
    sku: 'BEA-ESS-ESS-001',
    weight: 4,
    dimensions: { width: 15.14, height: 13.08, depth: 22.99 },
    warrantyInformation: '1 week warranty',
    shippingInformation: 'Ships in 3-5 business days',
    returnPolicy: 'No return policy',
    images: ['https://cdn.dummyjson.com/product-images/beauty/mascara/1.webp'],
    reviews: [],
    ...overrides,
  }
}

function transform(source, usedSlugs = new Set()) {
  return transformProduct(source, { categoryId: 'cat', usedSlugs, importedAt: new Date() })
}

describe('toCents', () => {
  it('rounds float prices to whole cents', () => {
    expect(toCents(9.99)).toBe(999)
    expect(toCents(19.99)).toBe(1999)
    expect(toCents(0.29)).toBe(29)
    expect(toCents(1899.99)).toBe(189999)
  })
})

describe('listPriceFor', () => {
  it('returns no list price when the discount is under 5%', () => {
    expect(listPriceFor(1000, 4.99)).toBeNull()
    expect(listPriceFor(1000, undefined)).toBeNull()
  })

  it('derives the list price from the discount when it is at least 5%', () => {
    expect(listPriceFor(900, 10)).toBe(1000)
    expect(listPriceFor(1000, 5)).toBe(1053)
  })
})

describe('transformProduct', () => {
  it('maps the source fields to the product schema', () => {
    const { product, base, imageUrls } = transform(sourceProduct())

    expect(product).toMatchObject({
      title: 'Essence Mascara Lash Princess',
      slug: 'essence-mascara-lash-princess',
      brand: 'Essence',
      status: 'active',
      source: { provider: 'dummyjson', externalId: '1' },
      specs: { weightOz: 4, warranty: '1 week warranty' },
    })
    expect(product.bullets).toEqual([
      'A popular mascara.',
      'Long lasting!',
      'Warranty: 1 week warranty',
      'Returns: No return policy',
      'Shipping: Ships in 3-5 business days',
    ])
    expect(base).toEqual({
      sku: 'BEA-ESS-ESS-001',
      priceCents: 999,
      listPriceCents: 1116,
      stock: 99,
    })
    expect(imageUrls).toHaveLength(1)
  })

  it('defaults a missing brand to Generic', () => {
    expect(transform(sourceProduct({ brand: undefined })).product.brand).toBe('Generic')
  })

  it('adds a numeric suffix when the slug is already used', () => {
    const usedSlugs = new Set()
    const first = transform(sourceProduct({ title: 'Rolex Cellini Moonphase' }), usedSlugs)
    const second = transform(sourceProduct({ title: 'Rolex Cellini Moonphase' }), usedSlugs)

    expect(first.product.slug).toBe('rolex-cellini-moonphase')
    expect(second.product.slug).toBe('rolex-cellini-moonphase-2')
  })
})
