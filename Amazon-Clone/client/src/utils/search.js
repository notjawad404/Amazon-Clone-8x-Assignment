import {
  DEFAULT_SORT,
  RATING_FILTERS,
  SEARCH_MAX_BRANDS,
  SEARCH_MAX_PRICE_DOLLARS,
  SEARCH_PAGE_SIZE,
  SORT_OPTIONS,
} from './constants'

const wholeDollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  trailingZeroDisplay: 'stripIfInteger',
})

export function searchPath(query, category = '') {
  const params = new URLSearchParams()
  if (query) params.set('k', query)
  if (category) params.set('category', category)
  return `/s?${params}`
}

/** Builds a query string, repeating the key for array values (`brand=A&brand=B`). */
export function toQueryString(params) {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    for (const item of [value].flat()) {
      if (item !== undefined && item !== null && item !== '') searchParams.append(key, item)
    }
  }
  return searchParams.toString()
}

function readPrice(value) {
  if (!value?.trim()) return null
  const dollars = Number(value)
  if (!Number.isFinite(dollars) || dollars < 0 || dollars > SEARCH_MAX_PRICE_DOLLARS) return null
  return Math.round(dollars * 100) / 100
}

function readPositiveInteger(value) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

// Ignores invalid URL values instead of sending them to the API, which would reject them.
export function readFilters(searchParams) {
  let minPrice = readPrice(searchParams.get('minPrice'))
  let maxPrice = readPrice(searchParams.get('maxPrice'))
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    ;[minPrice, maxPrice] = [maxPrice, minPrice]
  }
  const rating = readPositiveInteger(searchParams.get('rating'))
  const sort = searchParams.get('sort')
  const brands = searchParams
    .getAll('brand')
    .map((brand) => brand.trim())
    .filter(Boolean)

  return {
    query: searchParams.get('k')?.trim() ?? '',
    category: searchParams.get('category') ?? '',
    minPrice,
    maxPrice,
    rating: RATING_FILTERS.includes(rating) ? rating : null,
    brands: [...new Set(brands)].slice(0, SEARCH_MAX_BRANDS),
    includeOutOfStock: searchParams.get('inStock') === 'false',
    sort: SORT_OPTIONS.some((option) => option.value === sort) ? sort : DEFAULT_SORT,
    page: readPositiveInteger(searchParams.get('page')) ?? 1,
  }
}

export function toSearchApiParams(filters, category) {
  return {
    q: filters.query || undefined,
    category: category || undefined,
    minPrice: filters.minPrice ?? undefined,
    maxPrice: filters.maxPrice ?? undefined,
    rating: filters.rating ?? undefined,
    brand: filters.brands.length ? filters.brands : undefined,
    inStock: filters.includeOutOfStock ? undefined : true,
    sort: filters.sort === DEFAULT_SORT ? undefined : filters.sort,
    page: filters.page,
    limit: SEARCH_PAGE_SIZE,
  }
}

export function hasActiveFilters(filters) {
  return (
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.rating !== null ||
    filters.brands.length > 0 ||
    filters.includeOutOfStock
  )
}

export function formatPriceRange(min, max) {
  if (min === null) return `Under ${wholeDollars.format(max)}`
  if (max === null) return `${wholeDollars.format(min)} & above`
  return `${wholeDollars.format(min)} to ${wholeDollars.format(max)}`
}

/** Finds a slug in the category tree: `{ department, category }`, with `category` null for a department. */
export function findCategory(departments, slug) {
  if (!slug) return null
  for (const department of departments) {
    if (department.slug === slug) return { department, category: null }
    const category = department.children.find((child) => child.slug === slug)
    if (category) return { department, category }
  }
  return null
}
