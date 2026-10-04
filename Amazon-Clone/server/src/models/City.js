import mongoose, { Schema } from 'mongoose'

// ~150k reference rows, read-only after import, so no timestamps.
const citySchema = new Schema({
  country: { type: String, required: true, uppercase: true, match: /^[A-Z]{2}$/ },
  state: { type: String, required: true, trim: true, maxlength: 100 },
  name: { type: String, required: true, trim: true, maxlength: 100 },
})

citySchema.index({ country: 1, state: 1, name: 1 })

export const City = mongoose.model('City', citySchema)
