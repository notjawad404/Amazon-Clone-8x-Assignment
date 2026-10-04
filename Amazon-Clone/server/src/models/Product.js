import mongoose, { Schema } from 'mongoose'
import {
  DEFAULT_BRAND,
  MAX_BULLETS,
  MAX_IMAGES,
  MAX_TAGS,
  MAX_VARIANTS,
  PRODUCT_STATUSES,
} from '../utils/constants.js'
import { discountPercent } from '../utils/money.js'
import { statsFromBreakdown } from '../utils/ratings.js'
import { toSlug, withSuffix } from '../utils/slug.js'
import { externalIdIndex, imageSchema, integer, maxItems, sourceSchema } from './shared.js'

const variantSchema = new Schema({
  sku: { type: String, required: true, uppercase: true, trim: true, maxlength: 64 },
  label: { type: String, required: true, trim: true, maxlength: 60 },
  priceCents: { type: Number, required: true, min: 1, validate: integer },
  listPriceCents: {
    type: Number,
    default: null,
    validate: {
      validator(value) {
        return value === null || (Number.isInteger(value) && value >= this.priceCents)
      },
      message: 'listPriceCents must be an integer of at least priceCents',
    },
  },
  stock: { type: Number, required: true, min: 0, validate: integer },
  images: { type: [imageSchema], validate: maxItems(MAX_IMAGES) },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
})

const starCount = { type: Number, default: 0, min: 0 }

const productSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    slug: { type: String, required: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/ },
    brand: { type: String, required: true, trim: true, maxlength: 100, default: DEFAULT_BRAND },
    department: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    bullets: {
      type: [{ type: String, trim: true, maxlength: 300 }],
      validate: maxItems(MAX_BULLETS),
    },
    tags: {
      type: [{ type: String, lowercase: true, trim: true, maxlength: 50 }],
      validate: maxItems(MAX_TAGS),
    },
    images: { type: [imageSchema], validate: maxItems(MAX_IMAGES) },
    optionName: { type: String, trim: true, maxlength: 40, default: null },
    variants: {
      type: [variantSchema],
      validate: {
        validator: (variants) => variants.length >= 1 && variants.length <= MAX_VARIANTS,
        message: `A product needs 1 to ${MAX_VARIANTS} variants`,
      },
    },
    specs: {
      weightOz: { type: Number, min: 0 },
      dimensions: {
        width: { type: Number, min: 0 },
        height: { type: Number, min: 0 },
        depth: { type: Number, min: 0 },
      },
      warranty: { type: String, trim: true, maxlength: 200 },
      returnPolicy: { type: String, trim: true, maxlength: 200 },
      shippingNote: { type: String, trim: true, maxlength: 200 },
    },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'draft' },
    ratingAvg: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, min: 0, default: 0 },
    ratingBreakdown: { 1: starCount, 2: starCount, 3: starCount, 4: starCount, 5: starCount },
    minPriceCents: { type: Number, default: 0 },
    maxPriceCents: { type: Number, default: 0 },
    maxDiscountPercent: { type: Number, default: 0 },
    totalStock: { type: Number, default: 0 },
    inStock: { type: Boolean, default: false },
    salesCount: { type: Number, min: 0, default: 0 },
    source: { type: sourceSchema, required: true, default: () => ({}) },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

productSchema.index({ slug: 1 }, { unique: true })
productSchema.index({ 'variants.sku': 1 }, { unique: true })
productSchema.index(...externalIdIndex)
productSchema.index(
  { title: 'text', brand: 'text', tags: 'text', description: 'text' },
  { name: 'product_text', weights: { title: 10, brand: 5, tags: 3, description: 1 } },
)
productSchema.index({ category: 1, status: 1, minPriceCents: 1 })
productSchema.index({ department: 1, status: 1, minPriceCents: 1 })
productSchema.index({ category: 1, status: 1, ratingAvg: -1 })
productSchema.index({ department: 1, status: 1, ratingAvg: -1 })
productSchema.index({ status: 1, salesCount: -1 })
productSchema.index({ status: 1, maxDiscountPercent: -1 })
productSchema.index({ status: 1, publishedAt: -1 })
productSchema.index({ brand: 1 })
productSchema.index({ status: 1, updatedAt: -1 })

export function calculateDerivedFields(variants) {
  const active = variants.filter((variant) => variant.isActive)
  const prices = active.map((variant) => variant.priceCents)
  const discounts = active.map(({ priceCents, listPriceCents }) =>
    discountPercent(priceCents, listPriceCents),
  )
  const totalStock = active.reduce((sum, variant) => sum + variant.stock, 0)

  return {
    minPriceCents: prices.length ? Math.min(...prices) : 0,
    maxPriceCents: prices.length ? Math.max(...prices) : 0,
    maxDiscountPercent: Math.max(0, ...discounts),
    totalStock,
    inStock: totalStock > 0,
  }
}

function pickDefaultVariant(variants) {
  const defaults = variants.filter((variant) => variant.isDefault)
  if (defaults.length === 1) return defaults[0]
  return (
    defaults[0] ??
    variants.find((variant) => variant.isActive && variant.stock > 0) ??
    variants.find((variant) => variant.isActive) ??
    variants[0]
  )
}

async function generateSlug(product) {
  const baseSlug = toSlug(product.title)
  const existing = await product.constructor
    .find({
      slug: new RegExp(`^${baseSlug}(-\\d+)?$`),
      _id: mongoose.trusted({ $ne: product._id }),
    })
    .select('slug')
    .session(product.$session())
    .lean()
  const taken = new Set(existing.map(({ slug }) => slug))
  return withSuffix(baseSlug, (slug) => taken.has(slug))
}

async function syncDepartment(product) {
  if (!product.category) return
  const category = await mongoose
    .model('Category')
    .findById(product.category)
    .select('parent')
    .session(product.$session())
    .lean()
  if (!category) product.invalidate('category', 'Category not found')
  else if (!category.parent) product.invalidate('category', 'Choose a category, not a department')
  else product.department = category.parent
}

function checkVariants(product) {
  const skus = product.variants.map((variant) => variant.sku?.toUpperCase())
  if (new Set(skus).size !== skus.length) {
    product.invalidate('variants', 'Variant SKUs must be unique')
  }
  const defaultVariant = pickDefaultVariant(product.variants)
  for (const variant of product.variants) variant.isDefault = variant === defaultVariant
}

function checkPublishable(product) {
  if (product.status !== 'active') return
  if (!product.images.length) {
    product.invalidate('images', 'An active product needs at least 1 image')
  }
  if (!product.variants.some((variant) => variant.isActive)) {
    product.invalidate('variants', 'An active product needs at least 1 active variant')
  }
  product.publishedAt ??= new Date()
}

productSchema.pre('validate', async function () {
  if (!this.slug && this.title) this.slug = await generateSlug(this)
  await syncDepartment(this)
  checkVariants(this)
  checkPublishable(this)
})

productSchema.pre('save', function () {
  Object.assign(this, calculateDerivedFields(this.variants))
})

const activeVariantStocks = {
  $map: {
    input: { $filter: { input: '$variants', cond: '$$this.isActive' } },
    in: '$$this.stock',
  },
}

// Used after atomic $inc stock updates, which skip the save hooks.
productSchema.statics.syncStockFields = function (productId, session = null) {
  return this.updateOne(
    { _id: productId },
    [
      { $set: { totalStock: { $sum: activeVariantStocks } } },
      { $set: { inStock: { $gt: ['$totalStock', 0] } } },
    ],
    { session, updatePipeline: true },
  )
}

productSchema.statics.syncRatingFields = async function (productId, session = null) {
  const rows = await mongoose
    .model('Review')
    .aggregate([
      { $match: { product: new mongoose.Types.ObjectId(String(productId)) } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ])
    .session(session)
  const breakdown = Object.fromEntries(rows.map(({ _id, count }) => [_id, count]))
  return this.updateOne({ _id: productId }, { $set: statsFromBreakdown(breakdown) }, { session })
}

export const Product = mongoose.model('Product', productSchema)
