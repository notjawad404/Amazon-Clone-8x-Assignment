import mongoose from 'mongoose'
import { Category, Product } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { BRAND_FACET_LIMIT, DEAL_MIN_DISCOUNT_PERCENT, HOME_ROW_LIMIT } from '../utils/constants.js'
import { discountPercent } from '../utils/money.js'
import { freeDeliveryDate } from './pricing.service.js'
import { buildSearchQuery, buildShopperFilter } from './search.service.js'

const CATEGORY_FIELDS = 'name slug parent image sortOrder'

export const PRODUCT_CARD_PROJECTION = {
  slug: 1,
  title: 1,
  brand: 1,
  images: { $slice: 1 },
  minPriceCents: 1,
  ratingAvg: 1,
  ratingCount: 1,
  inStock: 1,
  'variants.priceCents': 1,
  'variants.listPriceCents': 1,
  'variants.isActive': 1,
}

export function toImage(image) {
  return image ? { url: image.url, alt: image.alt ?? '' } : null
}

function toCategoryNode({ _id, name, slug, image }) {
  return { _id, name, slug, image: toImage(image) }
}

export function toProductCard(product) {
  const { _id, slug, title, brand, images, minPriceCents, ratingAvg, ratingCount, inStock } =
    product
  const cheapest = product.variants.find(
    (variant) => variant.isActive && variant.priceCents === minPriceCents,
  )
  const percentOff = discountPercent(minPriceCents, cheapest?.listPriceCents)

  return {
    _id,
    slug,
    title,
    brand,
    image: toImage(images[0]),
    priceCents: minPriceCents,
    listPriceCents: percentOff ? cheapest.listPriceCents : null,
    discountPercent: percentOff,
    ratingAvg,
    ratingCount,
    inStock,
  }
}

// A category is visible only when it and its department are both active.
export async function getVisibleTree() {
  const categories = await Category.find({ isActive: true })
    .sort({ level: 1, sortOrder: 1, name: 1 })
    .select(CATEGORY_FIELDS)
    .lean()

  const departments = categories
    .filter((category) => !category.parent)
    .map((department) => ({ ...toCategoryNode(department), children: [] }))
  const departmentsById = new Map(
    departments.map((department) => [String(department._id), department]),
  )

  for (const category of categories) {
    if (!category.parent) continue
    departmentsById.get(String(category.parent))?.children.push(toCategoryNode(category))
  }
  return departments
}

export function visibleCategoryIds(departments) {
  return departments.flatMap((department) => department.children.map((category) => category._id))
}

// Returns the department (level 0) or category (level 1) for a slug, or null if it isn't visible.
export function findScope(departments, slug) {
  for (const department of departments) {
    const { _id, name } = department
    if (department.slug === slug) return { _id, name, slug, level: 0, department: null }
    const category = department.children.find((child) => child.slug === slug)
    if (category) {
      return {
        _id: category._id,
        name: category.name,
        slug,
        level: 1,
        department: { _id, name, slug: department.slug },
      }
    }
  }
  return null
}

async function bestSellerImagesByCategory() {
  const rows = await Product.aggregate([
    { $match: { status: 'active' } },
    { $sort: { salesCount: -1 } },
    { $group: { _id: '$category', image: { $first: { $first: '$images' } } } },
  ])
  return new Map(rows.map(({ _id, image }) => [String(_id), toImage(image)]))
}

export async function getCategoryTree() {
  const [departments, fallbackImages] = await Promise.all([
    getVisibleTree(),
    bestSellerImagesByCategory(),
  ])

  for (const department of departments) {
    for (const category of department.children) {
      category.image ??= fallbackImages.get(String(category._id)) ?? null
    }
    department.image ??= department.children.find((category) => category.image)?.image ?? null
  }
  return departments
}

async function findProductCards(filter, sort) {
  const products = await Product.find(filter)
    .sort(sort)
    .limit(HOME_ROW_LIMIT)
    .select(PRODUCT_CARD_PROJECTION)
    .lean()
  return products.map(toProductCard)
}

export async function getHome() {
  const departments = (await getVisibleTree()).filter((department) => department.children.length)
  const shopperFilter = buildShopperFilter({ visibleCategoryIds: visibleCategoryIds(departments) })

  const [bestSellers, newArrivals, deals, topRatedRows] = await Promise.all([
    findProductCards(shopperFilter, { salesCount: -1 }),
    findProductCards(shopperFilter, { publishedAt: -1 }),
    findProductCards(
      {
        ...shopperFilter,
        maxDiscountPercent: mongoose.trusted({ $gte: DEAL_MIN_DISCOUNT_PERCENT }),
      },
      { maxDiscountPercent: -1, salesCount: -1 },
    ),
    Promise.all(
      departments.map(async ({ _id, name, slug }) => ({
        department: { _id, name, slug },
        products: await findProductCards(
          { ...shopperFilter, department: _id },
          { ratingAvg: -1, ratingCount: -1 },
        ),
      })),
    ),
  ])

  return {
    bestSellers,
    newArrivals,
    deals,
    topRated: topRatedRows.filter((row) => row.products.length),
  }
}

function toListingCard(product, now) {
  const card = toProductCard(product)
  return {
    ...card,
    totalStock: product.totalStock,
    freeDeliveryDate: freeDeliveryDate(card.priceCents, now),
  }
}

async function brandFacet(facetFilter) {
  const rows = await Product.aggregate([
    { $match: facetFilter },
    { $group: { _id: '$brand', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: BRAND_FACET_LIMIT },
  ])
  return rows.map(({ _id, count }) => ({ name: _id, count }))
}

export async function searchProducts({ category, page, limit, ...params }) {
  const departments = await getVisibleTree()
  const scope = category ? findScope(departments, category) : null
  if (category && !scope) {
    throw new ApiError(404, 'Category not found', { code: 'category_not_found' })
  }

  const { filter, facetFilter, sort, projection } = buildSearchQuery({
    ...params,
    scope,
    visibleCategoryIds: visibleCategoryIds(departments),
  })
  const [products, total, brands] = await Promise.all([
    Product.find(filter)
      .select({ ...PRODUCT_CARD_PROJECTION, totalStock: 1, ...projection })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
    brandFacet(facetFilter),
  ])

  const now = new Date()
  return {
    items: products.map((product) => toListingCard(product, now)),
    total,
    page,
    pages: Math.ceil(total / limit),
    facets: { brands },
    category: scope,
  }
}
