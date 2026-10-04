import mongoose, { Schema } from 'mongoose'
import { integer } from './shared.js'

const reviewSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    authorName: { type: String, required: true, trim: true, maxlength: 100 },
    rating: { type: Number, required: true, min: 1, max: 5, validate: integer },
    title: { type: String, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    verifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true },
)

reviewSchema.index({ product: 1, createdAt: -1 })
reviewSchema.index(
  { product: 1, user: 1 },
  { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } },
)

export const Review = mongoose.model('Review', reviewSchema)
