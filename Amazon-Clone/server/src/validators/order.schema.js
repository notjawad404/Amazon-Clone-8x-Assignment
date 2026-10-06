import { z } from 'zod'
import { DEFAULT_ORDER_RANGE, ORDER_RANGES } from '../utils/constants.js'

export const orderParamsSchema = z.strictObject({
  orderNumber: z.string().regex(/^112-\d{7}-\d{7}$/, 'Invalid order number'),
})

export const listOrdersQuerySchema = z.strictObject({
  range: z
    .union([z.enum(ORDER_RANGES), z.string().regex(/^20\d{2}$/, 'Invalid range')])
    .default(DEFAULT_ORDER_RANGE),
  page: z.coerce.number().int().min(1).default(1),
})
