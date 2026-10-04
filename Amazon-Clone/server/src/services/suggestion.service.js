import { Product } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import {
  DEFAULT_BRAND,
  SUGGESTION_CATEGORY_LIMIT,
  SUGGESTION_PRODUCT_LIMIT,
  SUGGESTION_SCAN_LIMIT,
  SUGGESTION_TERM_LIMIT,
  SUGGESTION_TERM_MAX_WORDS,
} from '../utils/constants.js'
import { wordPrefixRegExp } from '../utils/regex.js'
import { findScope, getVisibleTree, toImage, visibleCategoryIds } from './catalog.service.js'
import { buildShopperFilter } from './search.service.js'

const SUGGESTION_PROJECTION = {
  slug: 1,
  title: 1,
  brand: 1,
  tags: 1,
  images: { $slice: 1 },
  minPriceCents: 1,
}

const TRAILING_FILLERS = new Set(['and', '&', 'for', 'with', 'of', 'the', 'in', 'on', 'by', '-'])

// "Apple iPhone 13 Pro" + "iph" → "iphone 13 pro": the matched word and the words after it.
function phraseFrom(text, regExp) {
  const match = regExp.exec(text)
  if (!match) return null
  const start = match.index + match[0].length - match[1].length
  const words = text.slice(start).toLowerCase().split(/\s+/).slice(0, SUGGESTION_TERM_MAX_WORDS)
  while (words.length > 1 && TRAILING_FILLERS.has(words.at(-1))) words.pop()
  return words.join(' ').replace(/[^\w)]+$/, '')
}

export function collectTerms(products, query, limit = SUGGESTION_TERM_LIMIT) {
  const regExp = wordPrefixRegExp(query)
  const terms = new Set()

  for (const product of products) {
    const brand = product.brand === DEFAULT_BRAND ? null : product.brand
    for (const text of [brand, ...(product.tags ?? []), product.title]) {
      const phrase = text && phraseFrom(text, regExp)
      if (phrase) terms.add(phrase)
      if (terms.size === limit) return [...terms]
    }
  }
  return [...terms]
}

function matchCategories(departments, scope, regExp) {
  const inScope = scope
    ? departments.filter(({ _id }) => String(_id) === String(scope.department?._id ?? scope._id))
    : departments

  return inScope
    .flatMap((department) => [
      { _id: department._id, name: department.name, slug: department.slug, department: null },
      ...department.children.map(({ _id, name, slug }) => ({
        _id,
        name,
        slug,
        department: department.name,
      })),
    ])
    .filter((category) => regExp.test(category.name))
    .slice(0, SUGGESTION_CATEGORY_LIMIT)
}

export async function getSuggestions({ q, category }) {
  const departments = await getVisibleTree()
  const scope = category ? findScope(departments, category) : null
  if (category && !scope) {
    throw new ApiError(404, 'Category not found', { code: 'category_not_found' })
  }

  const regExp = wordPrefixRegExp(q)
  const products = await Product.find({
    ...buildShopperFilter({ scope, visibleCategoryIds: visibleCategoryIds(departments) }),
    $or: [{ title: regExp }, { brand: regExp }, { tags: regExp }],
  })
    .select(SUGGESTION_PROJECTION)
    .sort({ salesCount: -1, _id: 1 })
    .limit(SUGGESTION_SCAN_LIMIT)
    .lean()

  return {
    terms: collectTerms(products, q),
    categories: matchCategories(departments, scope, regExp),
    products: products.slice(0, SUGGESTION_PRODUCT_LIMIT).map((product) => ({
      _id: product._id,
      slug: product.slug,
      title: product.title,
      image: toImage(product.images[0]),
      priceCents: product.minPriceCents,
    })),
  }
}
