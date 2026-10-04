import mongoose from 'mongoose'
import { Product, Review } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { RELATED_PRODUCT_LIMIT, REVIEW_PAGE_SIZE } from '../utils/constants.js'
import { discountPercent } from '../utils/money.js'
import {
  PRODUCT_CARD_PROJECTION,
  getVisibleTree,
  toImage,
  toProductCard,
  visibleCategoryIds,
} from './catalog.service.js'
import { standardDelivery } from './pricing.service.js'
import { buildShopperFilter } from './search.service.js'

const PRODUCT_DETAIL_PROJECTION =
  'title slug brand department category description bullets images optionName variants specs ratingAvg ratingCount ratingBreakdown'

const REVIEW_PROJECTION = 'authorName rating title body verifiedPurchase createdAt'

const REVIEW_SORTS = {
  recent: { createdAt: -1, _id: -1 },
  top: { rating: -1, createdAt: -1, _id: -1 },
}

// Drafts, archived products, and products in hidden categories all look missing to shoppers.
async function findVisibleProduct(slug, projection) {
  const departments = await getVisibleTree()
  const product = await Product.findOne({
    ...buildShopperFilter({ visibleCategoryIds: visibleCategoryIds(departments) }),
    slug,
  })
    .select(projection)
    .lean()
  if (!product) throw new ApiError(404, 'Product not found', { code: 'product_not_found' })
  return { product, departments }
}

function toVariant(variant, now) {
  const { _id, label, priceCents, listPriceCents, stock, images, isDefault } = variant
  const percentOff = discountPercent(priceCents, listPriceCents)
  return {
    _id,
    label,
    priceCents,
    listPriceCents: percentOff ? listPriceCents : null,
    discountPercent: percentOff,
    stock,
    images: images.map(toImage),
    isDefault,
    delivery: standardDelivery(priceCents, now),
  }
}

function findBreadcrumbs(departments, product) {
  const department = departments.find(({ _id }) => _id.equals(product.department))
  const category = department?.children.find(({ _id }) => _id.equals(product.category))
  if (!category) return []
  return [department, category].map(({ name, slug }) => ({ name, slug }))
}

export async function getProduct(slug) {
  const { product, departments } = await findVisibleProduct(slug, PRODUCT_DETAIL_PROJECTION)
  const now = new Date()

  return {
    _id: product._id,
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    description: product.description,
    bullets: product.bullets,
    images: product.images.map(toImage),
    optionName: product.optionName,
    variants: product.variants
      .filter((variant) => variant.isActive)
      .map((variant) => toVariant(variant, now)),
    specs: product.specs ?? {},
    ratingAvg: product.ratingAvg,
    ratingCount: product.ratingCount,
    ratingBreakdown: product.ratingBreakdown,
    breadcrumbs: findBreadcrumbs(departments, product),
  }
}

export async function getReviews(slug, { page, sort }) {
  const { product } = await findVisibleProduct(slug, '_id')
  const filter = { product: product._id }

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .select(REVIEW_PROJECTION)
      .sort(REVIEW_SORTS[sort])
      .skip((page - 1) * REVIEW_PAGE_SIZE)
      .limit(REVIEW_PAGE_SIZE)
      .lean(),
    Review.countDocuments(filter),
  ])

  return { items: reviews, total, page, pages: Math.ceil(total / REVIEW_PAGE_SIZE) }
}

export async function getRelated(slug) {
  const { product } = await findVisibleProduct(slug, '_id category')
  const related = await Product.find({
    status: 'active',
    category: product.category,
    _id: mongoose.trusted({ $ne: product._id }),
  })
    .select(PRODUCT_CARD_PROJECTION)
    .sort({ salesCount: -1, _id: 1 })
    .limit(RELATED_PRODUCT_LIMIT)
    .lean()

  return related.map(toProductCard)
}
