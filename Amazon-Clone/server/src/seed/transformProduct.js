import { DEFAULT_BRAND, MAX_BULLETS, MAX_TAGS } from '../utils/constants.js'
import { toSlug, withSuffix } from '../utils/slug.js'

const MIN_LIST_PRICE_DISCOUNT = 5

export function toCents(dollars) {
  return Math.round(dollars * 100)
}

export function listPriceFor(priceCents, discountPercentage) {
  if (!(discountPercentage >= MIN_LIST_PRICE_DISCOUNT)) return null
  return Math.round(priceCents / (1 - discountPercentage / 100))
}

function buildBullets(source) {
  const sentences = source.description.match(/[^.!?]+[.!?]*/g) ?? []
  const details = [
    source.warrantyInformation && `Warranty: ${source.warrantyInformation}`,
    source.returnPolicy && `Returns: ${source.returnPolicy}`,
    source.shippingInformation && `Shipping: ${source.shippingInformation}`,
  ]
  return [...sentences.map((sentence) => sentence.trim()), ...details]
    .filter(Boolean)
    .slice(0, MAX_BULLETS)
}

function buildSpecs(source) {
  return {
    weightOz: source.weight,
    dimensions: source.dimensions,
    warranty: source.warrantyInformation,
    returnPolicy: source.returnPolicy,
    shippingNote: source.shippingInformation,
  }
}

/**
 * Maps one DummyJSON product to Product fields. Variants and images are added by later steps.
 * `usedSlugs` is shared across the whole import so duplicate titles get a -2, -3 suffix.
 */
export function transformProduct(source, { categoryId, usedSlugs, importedAt }) {
  const slug = withSuffix(toSlug(source.title), (candidate) => usedSlugs.has(candidate))
  usedSlugs.add(slug)

  const priceCents = toCents(source.price)

  return {
    product: {
      title: source.title.trim(),
      slug,
      brand: source.brand?.trim() || DEFAULT_BRAND,
      category: categoryId,
      description: source.description.trim(),
      bullets: buildBullets(source),
      tags: source.tags.slice(0, MAX_TAGS),
      specs: buildSpecs(source),
      status: 'active',
      source: { provider: 'dummyjson', externalId: String(source.id), importedAt },
    },
    base: {
      sku: source.sku,
      priceCents,
      listPriceCents: listPriceFor(priceCents, source.discountPercentage),
      stock: source.stock,
    },
    imageUrls: source.images,
  }
}
