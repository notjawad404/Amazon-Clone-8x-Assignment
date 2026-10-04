import mongoose from 'mongoose'

const TEXT_SCORE = { $meta: 'textScore' }

export function buildShopperFilter({ scope = null, visibleCategoryIds }) {
  const filter = { status: 'active', category: mongoose.trusted({ $in: visibleCategoryIds }) }
  if (scope?.level === 0) filter.department = scope._id
  if (scope?.level === 1) filter.category = scope._id
  return filter
}

export function buildSearchQuery({ q, scope, visibleCategoryIds }) {
  const filter = buildShopperFilter({ scope, visibleCategoryIds })
  if (!q) return { filter, sort: { salesCount: -1, _id: 1 }, projection: {} }

  return {
    filter: { ...filter, $text: mongoose.trusted({ $search: q }) },
    sort: { score: TEXT_SCORE, salesCount: -1, _id: 1 },
    projection: { score: TEXT_SCORE },
  }
}
