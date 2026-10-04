import mongoose from 'mongoose'
import { Product } from '../models/index.js'
import { toImage } from './catalog.service.js'
import { calculateQuote, deliveryOptions } from './pricing.service.js'

function toLine(item, product) {
  const variant =
    product?.status === 'active'
      ? product.variants.find(
          (candidate) => candidate.isActive && candidate._id.equals(item.variantId),
        )
      : null
  const base = { product: item.product, variantId: item.variantId, qty: item.qty }
  if (!variant) {
    return {
      ...base,
      title: product?.title ?? 'Unavailable item',
      slug: null,
      image: null,
      available: false,
    }
  }
  return {
    ...base,
    title: product.title,
    slug: product.slug,
    image: toImage(variant.images[0] ?? product.images[0]),
    optionName: product.optionName,
    variantLabel: variant.label,
    sku: variant.sku,
    unitPriceCents: variant.priceCents,
    lineTotalCents: variant.priceCents * item.qty,
    stock: variant.stock,
    available: true,
  }
}

function issueFor(line) {
  if (!line.available) {
    return {
      variantId: line.variantId,
      code: 'unavailable',
      message: 'This item is no longer available.',
    }
  }
  if (line.stock >= line.qty) return null
  const message = line.stock ? `Only ${line.stock} left in stock.` : 'This item is out of stock.'
  return { variantId: line.variantId, code: 'out_of_stock', message }
}

/**
 * Prices checkout items from current product data only. Items that can't be bought become
 * issues and are left out of the quote.
 */
export async function priceCheckout({ items, deliveryMethod, now = new Date() }) {
  const productIds = [...new Set(items.map((item) => String(item.product)))]
  const products = await Product.find({ _id: mongoose.trusted({ $in: productIds }) })
    .select('slug title status images optionName variants')
    .lean()
  const productsById = new Map(products.map((product) => [String(product._id), product]))

  const lines = items.map((item) => toLine(item, productsById.get(String(item.product))))
  const issues = lines.map(issueFor).filter(Boolean)
  const purchasable = lines.filter((line) => line.available)
  const quote = calculateQuote({ items: purchasable, deliveryMethod, now })

  return {
    lines,
    issues,
    quote,
    deliveryOptions: deliveryOptions(quote.subtotalCents, now),
  }
}
