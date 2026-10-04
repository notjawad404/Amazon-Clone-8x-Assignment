import { Schema } from 'mongoose'
import { SOURCE_PROVIDERS } from '../utils/constants.js'

export const integer = { validator: Number.isInteger, message: '{PATH} must be an integer' }

export function maxItems(max) {
  return {
    validator: (items) => items.length <= max,
    message: `{PATH} can have at most ${max} items`,
  }
}

export const imageSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { _id: false },
)

export const sourceSchema = new Schema(
  {
    provider: { type: String, enum: SOURCE_PROVIDERS, required: true, default: 'manual' },
    externalId: { type: String, default: null },
    importedAt: { type: Date, default: null },
  },
  { _id: false },
)

const addressFields = {
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  line1: { type: String, required: true, trim: true, maxlength: 200 },
  line2: { type: String, trim: true, maxlength: 200 },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  state: { type: String, required: true, uppercase: true, trim: true, match: /^[A-Z]{2}$/ },
  zip: { type: String, required: true, trim: true, match: /^\d{5}(-\d{4})?$/ },
  country: { type: String, required: true, uppercase: true, trim: true, default: 'US' },
  phone: { type: String, required: true, trim: true, maxlength: 20 },
}

export const addressSchema = new Schema({
  ...addressFields,
  isDefault: { type: Boolean, default: false },
})

export const addressSnapshotSchema = new Schema(addressFields, { _id: false })

export const externalIdIndex = [
  { 'source.provider': 1, 'source.externalId': 1 },
  { unique: true, partialFilterExpression: { 'source.externalId': { $type: 'string' } } },
]
