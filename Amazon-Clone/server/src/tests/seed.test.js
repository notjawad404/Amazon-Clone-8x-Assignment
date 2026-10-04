import mongoose from 'mongoose'
import { describe, expect, it } from 'vitest'
import { Category, Order, Payment, Product, User } from '../models/index.js'
import { SeedRefusedError, seed } from '../seed/seed.js'

async function fakeUpload(products) {
  return new Map(
    products.map(({ slug, title, imageUrls }) => [
      slug,
      imageUrls.map((_, i) => ({
        url: `https://res.cloudinary.com/test/image/upload/amazon-clone/products/${slug}/${i + 1}`,
        publicId: `amazon-clone/products/${slug}/${i + 1}`,
        alt: title,
      })),
    ]),
  )
}

describe('seed', () => {
  it('imports the full catalog into an empty database', async () => {
    const summary = await seed({ uploadImages: fakeUpload })

    expect(summary).toMatchObject({
      categories: 28,
      departments: 6,
      products: 184,
      users: 2,
      orders: 4,
      payments: 4,
      images: 424,
    })
    expect(summary.variants).toBeGreaterThan(300)
    expect(summary.variants).toBeLessThan(320)
    expect(summary.reviews).toBeGreaterThan(1400)

    const fashion = await Category.findOne({ slug: 'fashion' }).lean()
    expect(await Product.countDocuments({ department: fashion._id })).toBe(49)
    expect(await Product.countDocuments({ slug: /^rolex-cellini-moonphase/ })).toBe(2)
    expect(await Order.distinct('status')).toEqual(
      expect.arrayContaining(['paid', 'shipped', 'delivered', 'cancelled']),
    )
    expect(
      await Payment.countDocuments({ amountRefundedCents: mongoose.trusted({ $gt: 0 }) }),
    ).toBe(1)
    expect(await User.findOne({ email: 'admin@example.com' }).lean()).toMatchObject({
      role: 'admin',
    })
  }, 60_000)

  it('refuses to run when the catalog already has data, and changes nothing', async () => {
    await Category.create({ name: 'Existing', slug: 'existing' })

    await expect(seed({ uploadImages: fakeUpload })).rejects.toBeInstanceOf(SeedRefusedError)
    expect(await Category.countDocuments()).toBe(1)
    expect(await Product.countDocuments()).toBe(0)
  })

  it('wipes and re-imports with reset', async () => {
    await Category.create({ name: 'Existing', slug: 'existing' })

    const summary = await seed({ reset: true, uploadImages: fakeUpload })

    expect(summary.products).toBe(184)
    expect(await Category.exists({ slug: 'existing' })).toBeNull()
  }, 60_000)
})
