import mongoose from 'mongoose'
import { Product } from '../models/index.js'
import { MAX_CART_QTY } from '../utils/constants.js'
import { discountPercent } from '../utils/money.js'
import { toImage } from './catalog.service.js'
import { calculateShippingCents, freeShippingRemainingCents } from './pricing.service.js'

const CART_PRODUCT_PROJECTION = 'slug title status images optionName variants'

function findActiveVariant(product, variantId) {
  if (product?.status !== 'active') return null
  return product.variants.find((variant) => variant.isActive && variant._id.equals(variantId))
}

function toCartLine(item, product) {
  const line = {
    _id: item._id,
    productId: item.product,
    variantId: item.variantId,
    qty: item.qty,
    savedForLater: item.savedForLater,
    addedAt: item.addedAt,
  }
  const variant = findActiveVariant(product, item.variantId)
  if (!variant) {
    return {
      ...line,
      title: product?.title ?? 'This item is no longer available',
      slug: null,
      image: toImage(product?.images[0]),
      unavailable: true,
      outOfStock: false,
      priceChanged: false,
    }
  }

  const percentOff = discountPercent(variant.priceCents, variant.listPriceCents)
  const listPriceCents = percentOff ? variant.listPriceCents : null
  return {
    ...line,
    title: product.title,
    slug: product.slug,
    image: toImage(variant.images[0] ?? product.images[0]),
    optionName: product.optionName,
    variantLabel: variant.label,
    priceCents: variant.priceCents,
    listPriceCents,
    lineTotalCents: variant.priceCents * item.qty,
    listLineTotalCents: (listPriceCents ?? variant.priceCents) * item.qty,
    addedPriceCents: item.addedPriceCents ?? variant.priceCents,
    stock: variant.stock,
    maxQty: Math.min(variant.stock, MAX_CART_QTY),
    unavailable: false,
    outOfStock: variant.stock === 0,
    priceChanged: item.addedPriceCents != null && item.addedPriceCents !== variant.priceCents,
  }
}

function summarize(lines) {
  const inCart = lines.filter((line) => !line.savedForLater)
  const purchasable = inCart.filter((line) => !line.unavailable && !line.outOfStock)
  const subtotalCents = purchasable.reduce((sum, line) => sum + line.lineTotalCents, 0)
  const listSubtotalCents = purchasable.reduce((sum, line) => sum + line.listLineTotalCents, 0)
  const itemCount = purchasable.reduce((sum, line) => sum + line.qty, 0)

  return {
    items: lines,
    count: inCart.reduce((sum, line) => sum + line.qty, 0),
    itemCount,
    subtotalCents,
    listSubtotalCents,
    savingsCents: listSubtotalCents - subtotalCents,
    qualifiesForFreeShipping:
      itemCount > 0 && calculateShippingCents(subtotalCents, 'standard') === 0,
    freeShippingRemainingCents: freeShippingRemainingCents(subtotalCents),
  }
}

// Fills in the current title, image, price, and stock, and flags items that can't be bought.
export async function hydrateCart(items) {
  const productIds = [...new Set(items.map((item) => String(item.product)))]
  const products = productIds.length
    ? await Product.find({ _id: mongoose.trusted({ $in: productIds }) })
        .select(CART_PRODUCT_PROJECTION)
        .lean()
    : []
  const productsById = new Map(products.map((product) => [String(product._id), product]))

  const lines = items
    .map((item) => toCartLine(item, productsById.get(String(item.product))))
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
  return summarize(lines)
}
