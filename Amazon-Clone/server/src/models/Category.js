import mongoose, { Schema } from 'mongoose'
import { toSlug } from '../utils/slug.js'
import { externalIdIndex, imageSchema, sourceSchema } from './shared.js'

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    slug: { type: String, required: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/ },
    description: { type: String, trim: true, maxlength: 500 },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    level: { type: Number, enum: [0, 1], default: 0 },
    image: { type: imageSchema, default: null },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    source: { type: sourceSchema, required: true, default: () => ({}) },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

categorySchema.index({ slug: 1 }, { unique: true })
categorySchema.index({ parent: 1, isActive: 1, sortOrder: 1 })
categorySchema.index(...externalIdIndex)

categorySchema.pre('validate', async function () {
  if (!this.slug && this.name) this.slug = toSlug(this.name)

  if (!this.parent) {
    this.level = 0
    return
  }
  if (this.parent.equals(this._id)) {
    this.invalidate('parent', 'A category cannot be its own parent')
    return
  }
  const parent = await this.constructor
    .findById(this.parent)
    .select('parent')
    .session(this.$session())
    .lean()
  if (!parent) this.invalidate('parent', 'Parent category not found')
  else if (parent.parent) this.invalidate('parent', 'Parent must be a department')
  this.level = 1
})

export const Category = mongoose.model('Category', categorySchema)
