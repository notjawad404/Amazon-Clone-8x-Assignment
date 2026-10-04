import mongoose, { Schema } from 'mongoose'

const stateSchema = new Schema(
  {
    code: { type: String, trim: true, maxlength: 10, default: null },
    name: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { _id: false },
)

// Reference data imported by `npm run seed:locations`. States are embedded: at most a few
// hundred per country.
const countrySchema = new Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true, match: /^[A-Z]{2}$/ },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    states: [stateSchema],
  },
  { timestamps: true },
)

countrySchema.index({ code: 1 }, { unique: true })

export const Country = mongoose.model('Country', countrySchema)
