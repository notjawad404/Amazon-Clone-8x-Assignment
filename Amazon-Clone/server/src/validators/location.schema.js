import { z } from 'zod'

const countryCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'Invalid country code')

export const statesParamsSchema = z.strictObject({ countryCode })

export const citiesQuerySchema = z.strictObject({
  country: countryCode,
  state: z.string().trim().min(1).max(100),
})
