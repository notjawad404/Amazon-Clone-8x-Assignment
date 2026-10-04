import { z } from 'zod'

export const orderParamsSchema = z.strictObject({
  orderNumber: z.string().regex(/^112-\d{7}-\d{7}$/, 'Invalid order number'),
})
