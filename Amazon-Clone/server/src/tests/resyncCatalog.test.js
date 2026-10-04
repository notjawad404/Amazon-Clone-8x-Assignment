import { describe, expect, it } from 'vitest'
import { Product } from '../models/index.js'
import { resyncCatalog } from '../seed/resyncCatalog.js'
import { createCategoryTree, createProduct, variant } from './helpers.js'

describe('resyncCatalog', () => {
  it('recalculates derived fields after a direct database edit', async () => {
    const { category } = await createCategoryTree()
    const product = await createProduct(category, {
      variants: [variant({ priceCents: 1000, stock: 4 })],
    })
    await Product.collection.updateOne(
      { _id: product._id },
      { $set: { 'variants.0.priceCents': 750, 'variants.0.stock': 0 } },
    )

    const result = await resyncCatalog()

    expect(result).toEqual({ checked: 1, updated: 1, failed: [] })
    expect(await Product.findById(product._id).lean()).toMatchObject({
      minPriceCents: 750,
      maxPriceCents: 750,
      totalStock: 0,
      inStock: false,
    })
  })
})
