import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { pathToFileURL } from 'node:url'
import { faker } from '@faker-js/faker'
import { Types } from 'mongoose'
import { connectDB, disconnectDB } from '../config/db.js'
import { env } from '../config/env.js'
import { ALL_MODELS, Category, Product, Review } from '../models/index.js'
import { logger } from '../utils/logger.js'
import { DEPARTMENTS, EXCLUDED_SOURCE_CATEGORIES } from './categoryMap.js'
import { generateReviews } from './generateReviews.js'
import { generateVariants } from './generateVariants.js'
import { importLocations } from './seedLocations.js'
import { seedUsersAndOrders } from './seedUsersAndOrders.js'
import { transformProduct } from './transformProduct.js'
import { uploadProductImages } from './uploadImages.js'

const FAKER_SEED = 20261004
const DATA_DIR = new URL('./data/', import.meta.url)
const PUBLISH_HISTORY_YEARS = 1

export class SeedRefusedError extends Error {
  constructor(counts) {
    super(
      `The catalog already has data (${counts.categories} categories, ${counts.products} products). ` +
        'Nothing was changed. Use `npm run seed -- --reset` to wipe and re-import (development only).',
    )
    this.name = 'SeedRefusedError'
    this.counts = counts
  }
}

async function getCatalogCounts() {
  const [categories, products] = await Promise.all([
    Category.estimatedDocumentCount(),
    Product.estimatedDocumentCount(),
  ])
  return { categories, products }
}

async function loadSnapshot() {
  try {
    const json = await readFile(new URL('dummyjson-products.json', DATA_DIR), 'utf8')
    return JSON.parse(json).products
  } catch (err) {
    throw new Error(
      `Could not read seed/data/dummyjson-products.json. Run npm run seed:fetch first. (${err.message})`,
    )
  }
}

function buildCategories(importedAt) {
  const source = (externalId) => ({ provider: 'dummyjson', externalId, importedAt })
  const departments = []
  const categories = []
  const categoryIdBySourceSlug = new Map()

  DEPARTMENTS.forEach((department, departmentIndex) => {
    const departmentId = new Types.ObjectId()
    departments.push({
      _id: departmentId,
      name: department.name,
      slug: department.slug,
      sortOrder: departmentIndex,
      source: source(null),
    })
    department.categories.forEach((category, categoryIndex) => {
      const categoryId = new Types.ObjectId()
      categories.push({
        _id: categoryId,
        name: category.name,
        slug: category.slug,
        parent: departmentId,
        sortOrder: categoryIndex,
        source: source(category.sourceSlug),
      })
      categoryIdBySourceSlug.set(category.sourceSlug, categoryId)
    })
  })

  return { departments, categories, categoryIdBySourceSlug }
}

function salesCountFor({ ratingAvg, ratingCount }) {
  return Math.round(ratingAvg * ratingCount * faker.number.int({ min: 2, max: 30 }))
}

function buildCatalog(sourceProducts, categoryIdBySourceSlug, now) {
  const usedSlugs = new Set()
  const products = []
  const reviews = []

  for (const source of sourceProducts) {
    if (EXCLUDED_SOURCE_CATEGORIES.has(source.category)) continue
    const categoryId = categoryIdBySourceSlug.get(source.category)
    if (!categoryId) throw new Error(`No category mapping for "${source.category}"`)

    const productId = new Types.ObjectId()
    const { product, base, imageUrls } = transformProduct(source, {
      categoryId,
      usedSlugs,
      importedAt: now,
    })
    const { optionName, variants } = generateVariants(source.category, base, faker)
    const generated = generateReviews(source, { productId, faker, now })

    products.push({
      ...product,
      _id: productId,
      optionName,
      variants,
      imageUrls,
      ...generated.stats,
      salesCount: salesCountFor(generated.stats),
      publishedAt: faker.date.past({ years: PUBLISH_HISTORY_YEARS, refDate: now }),
    })
    reviews.push(...generated.reviews)
  }

  return { products, reviews }
}

async function clearDatabase() {
  await Promise.all(ALL_MODELS.map((Model) => Model.deleteMany({})))
}

async function syncAllIndexes() {
  for (const Model of ALL_MODELS) await Model.syncIndexes()
}

/**
 * Imports the DummyJSON snapshot into an empty database. Image uploads happen before any write,
 * so a failed upload leaves the database untouched.
 */
export async function seed({
  reset = false,
  now = new Date(),
  uploadImages = uploadProductImages,
  onProgress,
} = {}) {
  if (reset && env.NODE_ENV === 'production') {
    throw new Error('--reset is not allowed in production')
  }
  const counts = await getCatalogCounts()
  if (!reset && (counts.categories > 0 || counts.products > 0)) throw new SeedRefusedError(counts)

  faker.seed(FAKER_SEED)
  const sourceProducts = await loadSnapshot()
  const { departments, categories, categoryIdBySourceSlug } = buildCategories(now)
  const { products, reviews } = buildCatalog(sourceProducts, categoryIdBySourceSlug, now)
  const imagesBySlug = await uploadImages(products, { onProgress })

  if (reset) await clearDatabase()
  await syncAllIndexes()

  await Category.create(departments)
  await Category.create(categories)
  const productDocs = await Product.create(
    products.map(({ imageUrls: _imageUrls, ...product }) => ({
      ...product,
      images: imagesBySlug.get(product.slug),
    })),
  )
  await Review.insertMany(reviews)
  const { users, orderCount } = await seedUsersAndOrders({ products: productDocs, faker, now })

  return {
    categories: departments.length + categories.length,
    departments: departments.length,
    products: productDocs.length,
    variants: productDocs.reduce((sum, product) => sum + product.variants.length, 0),
    reviews: reviews.length,
    users: users.length,
    orders: orderCount,
    payments: orderCount,
    images: productDocs.reduce((sum, product) => sum + product.images.length, 0),
  }
}

async function confirmReset() {
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await prompt.question(
    `This deletes ALL data in "${env.MONGODB_URI.split('@').pop()}" and re-imports. Type "reset" to continue: `,
  )
  prompt.close()
  return answer.trim() === 'reset'
}

function printProgress({ done, skipped, total }) {
  const line = `Images: ${done}/${total} (${skipped} already in Cloudinary)`
  if (process.stdout.isTTY) process.stdout.write(`\r${line}${done === total ? '\n' : ''}`)
  else if (done % 50 === 0 || done === total) logger.info(line)
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const reset = args.has('--reset')

  await connectDB()
  try {
    if (reset && !args.has('--yes') && !(await confirmReset())) {
      logger.info('Reset cancelled. Nothing was changed.')
      return 1
    }
    logger.info(reset ? 'Resetting and importing the catalog...' : 'Importing the catalog...')
    const summary = await seed({ reset, onProgress: printProgress })

    logger.info('\nSeed complete:')
    logger.info(`  ${summary.categories} categories (${summary.departments} departments)`)
    logger.info(`  ${summary.products} products, ${summary.variants} variants`)
    logger.info(`  ${summary.reviews} reviews`)
    logger.info(`  ${summary.users} users (demo@example.com, admin@example.com)`)
    logger.info(`  ${summary.orders} orders, ${summary.payments} payments`)
    logger.info(`  ${summary.images} images`)

    const locations = await importLocations()
    if (!locations.skipped) {
      logger.info(
        `  ${locations.countries} countries, ${locations.states} states, ${locations.cities} cities`,
      )
    }
    return 0
  } catch (err) {
    if (!(err instanceof SeedRefusedError)) throw err
    logger.warn(err.message)
    return 1
  } finally {
    await disconnectDB()
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main())
}
