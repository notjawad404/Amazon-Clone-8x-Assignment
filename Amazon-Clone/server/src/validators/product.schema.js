import { z } from 'zod'
import {
  REVIEW_SORTS,
  SEARCH_MAX_BRANDS,
  SEARCH_MAX_PAGE_SIZE,
  SEARCH_MAX_PRICE_DOLLARS,
  SEARCH_MAX_RATING,
  SEARCH_PAGE_SIZE,
  SEARCH_QUERY_MAX_LENGTH,
  SEARCH_SORTS,
} from '../utils/constants.js'

const query = z
  .string()
  .trim()
  .max(SEARCH_QUERY_MAX_LENGTH, `Search must be at most ${SEARCH_QUERY_MAX_LENGTH} characters`)

const categorySlug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]+$/, 'Invalid category')
  .max(80)

const priceDollars = z.coerce.number().min(0).max(SEARCH_MAX_PRICE_DOLLARS)

const brand = z.string().trim().min(1).max(100)

// Repeated params (`brand=A&brand=B`) arrive as an array, a single one as a string.
const brands = z
  .union([brand, z.array(brand).max(SEARCH_MAX_BRANDS)])
  .transform((value) => [...new Set([value].flat())])

export const searchQuerySchema = z
  .strictObject({
    q: query.optional(),
    category: categorySlug.optional(),
    minPrice: priceDollars.optional(),
    maxPrice: priceDollars.optional(),
    rating: z.coerce.number().int().min(1).max(SEARCH_MAX_RATING).optional(),
    brand: brands.optional(),
    inStock: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    sort: z.enum(SEARCH_SORTS).default('relevance'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(SEARCH_MAX_PAGE_SIZE).default(SEARCH_PAGE_SIZE),
  })
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
    { message: 'Min price must not be more than max price', path: ['maxPrice'] },
  )

export const productParamsSchema = z.strictObject({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Invalid product')
    .max(200),
})

export const reviewsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  sort: z.enum(REVIEW_SORTS).default('recent'),
})

export const emptyQuerySchema = z.strictObject({})

export const suggestionsQuerySchema = z.strictObject({
  q: query.min(1, 'Enter a search term'),
  category: categorySlug.optional(),
})
