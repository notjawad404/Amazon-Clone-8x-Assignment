import { pathToFileURL } from 'node:url'
import { connectDB, disconnectDB } from '../config/db.js'
import { Product } from '../models/index.js'
import { logger } from '../utils/logger.js'

const DERIVED_FIELDS = [
  'department',
  'minPriceCents',
  'maxPriceCents',
  'maxDiscountPercent',
  'totalStock',
  'inStock',
  'ratingAvg',
  'ratingCount',
]

function snapshot(product) {
  return JSON.stringify(DERIVED_FIELDS.map((field) => product[field]))
}

/**
 * Recalculates the fields that hooks normally maintain, for products edited directly in
 * Compass or Atlas (where the hooks never ran).
 */
export async function resyncCatalog() {
  const result = { checked: 0, updated: 0, failed: [] }

  for await (const product of Product.find().cursor()) {
    result.checked += 1
    const before = snapshot(product)
    try {
      await product.save()
      await Product.syncRatingFields(product._id)
      const after = await Product.findById(product._id).lean()
      if (snapshot(after) !== before) result.updated += 1
    } catch (err) {
      result.failed.push(`${product.slug}: ${err.message}`)
    }
  }

  return result
}

async function main() {
  await connectDB()
  try {
    const { checked, updated, failed } = await resyncCatalog()
    logger.info(`Checked ${checked} products, updated ${updated}.`)
    if (failed.length) logger.warn(`Failed to resync ${failed.length}:\n  ${failed.join('\n  ')}`)
    return failed.length ? 1 : 0
  } finally {
    await disconnectDB()
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main())
}
