import { z } from 'zod'
import { objectId } from './common.js'

const text = (label, max) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max)

// No defaults here: a partial update must leave fields it doesn't send untouched.
const addressFields = {
  fullName: text('Full name', 100),
  line1: text('Address', 200),
  line2: z.string().trim().max(200),
  city: text('City', 100),
  state: z.string().trim().max(100),
  zip: z
    .string()
    .trim()
    .regex(/^([A-Za-z0-9][A-Za-z0-9 -]{1,11})?$/, 'Enter a valid postal code'),
  country: z
    .string({ error: 'Choose a country' })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Choose a country'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+()\-.\s]{7,20}$/, 'Enter a valid phone number'),
}

export const createAddressSchema = z.strictObject({
  ...addressFields,
  line2: addressFields.line2.default(''),
  state: addressFields.state.default(''),
  zip: addressFields.zip.default(''),
  isDefault: z.boolean().optional().default(false),
})

export const updateAddressSchema = z
  .strictObject(addressFields)
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update' })

export const addressParamsSchema = z.strictObject({ addressId: objectId })
