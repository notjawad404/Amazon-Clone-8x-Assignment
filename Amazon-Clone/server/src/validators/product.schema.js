import { z } from 'zod'
import {
  SEARCH_MAX_PAGE_SIZE,
  SEARCH_PAGE_SIZE,
  SEARCH_QUERY_MAX_LENGTH,
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

export const searchQuerySchema = z.strictObject({
  q: query.optional(),
  category: categorySlug.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(SEARCH_MAX_PAGE_SIZE).default(SEARCH_PAGE_SIZE),
})

export const suggestionsQuerySchema = z.strictObject({
  q: query.min(1, 'Enter a search term'),
  category: categorySlug.optional(),
})
