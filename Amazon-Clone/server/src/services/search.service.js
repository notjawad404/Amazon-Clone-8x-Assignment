import mongoose from 'mongoose'

const TEXT_SCORE = { $meta: 'textScore' }

const SORTS = {
  price_asc: { minPriceCents: 1 },
  price_desc: { minPriceCents: -1 },
  rating: { ratingAvg: -1, ratingCount: -1 },
  newest: { publishedAt: -1 },
}

function dollarsToCents(dollars) {
  return Math.round(dollars * 100)
}

export function buildShopperFilter({ scope = null, visibleCategoryIds }) {
  const filter = { status: 'active', category: mongoose.trusted({ $in: visibleCategoryIds }) }
  if (scope?.level === 0) filter.department = scope._id
  if (scope?.level === 1) filter.category = scope._id
  return filter
}

function buildPriceFilter(minPrice, maxPrice) {
  const range = {}
  if (minPrice !== undefined) range.$gte = dollarsToCents(minPrice)
  if (maxPrice !== undefined) range.$lte = dollarsToCents(maxPrice)
  return Object.keys(range).length ? mongoose.trusted(range) : undefined
}

function buildSort(sort, q) {
  if (SORTS[sort]) return { ...SORTS[sort], _id: 1 }
  return q ? { score: TEXT_SCORE, salesCount: -1, _id: 1 } : { salesCount: -1, _id: 1 }
}

export function buildSearchQuery({
  q,
  scope,
  visibleCategoryIds,
  minPrice,
  maxPrice,
  rating,
  brand,
  inStock,
  sort = 'relevance',
}) {
  const facetFilter = buildShopperFilter({ scope, visibleCategoryIds })
  if (q) facetFilter.$text = mongoose.trusted({ $search: q })

  const minPriceCents = buildPriceFilter(minPrice, maxPrice)
  if (minPriceCents) facetFilter.minPriceCents = minPriceCents
  if (rating) facetFilter.ratingAvg = mongoose.trusted({ $gte: rating })
  if (inStock) facetFilter.inStock = true

  const filter = brand?.length
    ? { ...facetFilter, brand: mongoose.trusted({ $in: brand }) }
    : facetFilter

  return {
    filter,
    facetFilter,
    sort: buildSort(sort, q),
    projection: q && !SORTS[sort] ? { score: TEXT_SCORE } : {},
  }
}
