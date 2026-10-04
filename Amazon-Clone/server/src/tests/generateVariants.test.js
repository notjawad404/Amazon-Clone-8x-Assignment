import { faker } from '@faker-js/faker'
import { beforeEach, describe, expect, it } from 'vitest'
import { generateVariants, splitStock } from '../seed/generateVariants.js'

const base = { sku: 'SMA-APP-IPH-001', priceCents: 99_900, listPriceCents: 109_900, stock: 60 }

beforeEach(() => {
  faker.seed(1)
})

describe('generateVariants', () => {
  it.each([
    ['mens-shirts', 'Size', 4],
    ['tops', 'Size', 4],
    ['womens-dresses', 'Size', 4],
    ['mens-shoes', 'Size', 5],
    ['womens-shoes', 'Size', 5],
    ['smartphones', 'Storage', 3],
    ['tablets', 'Storage', 3],
    ['laptops', 'Configuration', 2],
    ['groceries', null, 1],
  ])('creates the right variants for %s', (category, optionName, count) => {
    const result = generateVariants(category, base, faker)

    expect(result.optionName).toBe(optionName)
    expect(result.variants).toHaveLength(count)
  })

  it('adds the storage price step to price and list price', () => {
    const { variants } = generateVariants('smartphones', base, faker)

    expect(variants.map((v) => [v.label, v.priceCents, v.listPriceCents])).toEqual([
      ['128 GB', 99_900, 109_900],
      ['256 GB', 109_900, 119_900],
      ['512 GB', 119_900, 129_900],
    ])
  })

  it('builds unique SKUs from the source SKU', () => {
    const { variants } = generateVariants('mens-shoes', base, faker)

    expect(variants.map((v) => v.sku)).toEqual([
      'SMA-APP-IPH-001-US8',
      'SMA-APP-IPH-001-US9',
      'SMA-APP-IPH-001-US10',
      'SMA-APP-IPH-001-US11',
      'SMA-APP-IPH-001-US12',
    ])
    expect(generateVariants('groceries', base, faker).variants[0].sku).toBe('SMA-APP-IPH-001-STD')
  })

  it('marks exactly one variant as default, preferring one in stock', () => {
    for (let i = 0; i < 50; i += 1) {
      const { variants } = generateVariants('mens-shirts', base, faker)
      const defaults = variants.filter((v) => v.isDefault)

      expect(defaults).toHaveLength(1)
      if (variants.some((v) => v.stock > 0)) expect(defaults[0].stock).toBeGreaterThan(0)
    }
  })

  it('never hands out more stock than the source had', () => {
    for (let i = 0; i < 50; i += 1) {
      const { variants } = generateVariants('womens-shoes', base, faker)
      const total = variants.reduce((sum, v) => sum + v.stock, 0)

      expect(total).toBeLessThanOrEqual(base.stock)
    }
  })
})

describe('splitStock', () => {
  it('splits the whole amount across the parts', () => {
    const shares = splitStock(97, 4, faker)

    expect(shares).toHaveLength(4)
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(97)
  })
})
