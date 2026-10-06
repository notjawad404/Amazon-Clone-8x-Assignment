import mongoose from 'mongoose'
import { Product } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'

async function syncProducts(items, session) {
  const productIds = [...new Set(items.map((item) => String(item.product)))]
  for (const productId of productIds) await Product.syncStockFields(productId, session)
}

// Takes stock for every item or throws, so the caller's transaction rolls everything back.
export async function reserveStock(items, session) {
  for (const item of items) {
    const { modifiedCount } = await Product.updateOne(
      {
        _id: item.product,
        status: 'active',
        variants: mongoose.trusted({
          $elemMatch: { _id: item.variantId, isActive: true, stock: { $gte: item.qty } },
        }),
      },
      { $inc: { 'variants.$.stock': -item.qty } },
      { session },
    )
    if (!modifiedCount) {
      throw new ApiError(409, `“${item.title}” no longer has enough stock.`, {
        code: 'out_of_stock',
        details: [{ variantId: item.variantId, title: item.title }],
      })
    }
  }
  await syncProducts(items, session)
}

export async function releaseStock(items, session) {
  for (const item of items) {
    await Product.updateOne(
      { _id: item.product, 'variants._id': item.variantId },
      { $inc: { 'variants.$.stock': item.qty } },
      { session },
    )
  }
  await syncProducts(items, session)
}

export async function recordSales(items, session) {
  for (const item of items) {
    await Product.updateOne({ _id: item.product }, { $inc: { salesCount: item.qty } }, { session })
  }
}

// Undoes recordSales for a cancelled paid order, never taking a count below zero.
export async function reverseSales(items, session) {
  for (const item of items) {
    await Product.updateOne(
      { _id: item.product, salesCount: mongoose.trusted({ $gte: item.qty }) },
      { $inc: { salesCount: -item.qty } },
      { session },
    )
  }
}
