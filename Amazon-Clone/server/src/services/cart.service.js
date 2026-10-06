import mongoose from 'mongoose'
import { Cart, Product } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { CART_SAVE_ATTEMPTS, MAX_CART_ITEMS, MAX_CART_QTY } from '../utils/constants.js'
import { hydrateCart } from './cartView.service.js'

function unavailableError(productId, variantId) {
  return new ApiError(409, 'This item is no longer available.', {
    code: 'unavailable',
    details: [{ productId, variantId }],
  })
}

function itemNotFound() {
  return new ApiError(404, 'This item is not in your cart.', { code: 'cart_item_not_found' })
}

async function findActiveVariant(productId, variantId) {
  const product = await Product.findOne({ _id: productId, status: 'active' })
    .select('variants')
    .lean()
  const variant = product?.variants.find(
    (candidate) => candidate.isActive && candidate._id.equals(variantId),
  )
  if (!variant) throw unavailableError(productId, variantId)
  return variant
}

function isConflict(error) {
  return error instanceof mongoose.Error.VersionError || error?.code === 11000
}

// One cart document per user. Concurrent writes are caught by the version check (or the unique
// user index for a new cart) and retried on fresh data. An emptied cart is deleted.
async function updateCart(userId, mutate) {
  for (let attempt = 1; ; attempt += 1) {
    const cart = (await Cart.findOne({ user: userId })) ?? new Cart({ user: userId, items: [] })
    await mutate(cart)
    try {
      if (cart.items.length) return await cart.save()
      if (!cart.isNew) {
        const { deletedCount } = await Cart.deleteOne({ _id: cart._id, __v: cart.__v })
        if (!deletedCount) throw new mongoose.Error.VersionError(cart, cart.__v, [])
      }
      return cart
    } catch (error) {
      if (!isConflict(error)) throw error
      if (attempt >= CART_SAVE_ATTEMPTS) {
        throw new ApiError(409, 'Your cart was changed elsewhere. Please try again.', {
          code: 'cart_conflict',
        })
      }
    }
  }
}

// Adds qty to the line for this variant (creating it if needed), capped at stock and MAX_CART_QTY.
function addToCart(cart, { productId, variant, qty, savedForLater = false }) {
  const limit = Math.min(variant.stock, MAX_CART_QTY)
  const existing = cart.items.find((item) => item.variantId.equals(variant._id))
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, limit)
    existing.savedForLater &&= savedForLater
    return true
  }
  if (cart.items.length >= MAX_CART_ITEMS) return false
  cart.items.push({
    product: productId,
    variantId: variant._id,
    qty: Math.min(qty, limit),
    savedForLater,
    addedPriceCents: variant.priceCents,
  })
  return true
}

export async function getCart(userId) {
  const cart = await Cart.findOne({ user: userId }).lean()
  return hydrateCart(cart?.items ?? [])
}

export async function addItem(userId, { productId, variantId, qty }) {
  const variant = await findActiveVariant(productId, variantId)
  if (variant.stock === 0) {
    throw new ApiError(409, 'This item is out of stock.', {
      code: 'out_of_stock',
      details: [{ productId, variantId }],
    })
  }

  const cart = await updateCart(userId, (draft) => {
    if (!addToCart(draft, { productId, variant, qty })) {
      throw new ApiError(409, `Your cart can hold up to ${MAX_CART_ITEMS} items.`, {
        code: 'cart_full',
      })
    }
  })
  return hydrateCart(cart.items)
}

export async function updateItem(userId, itemId, { qty, savedForLater }) {
  const cart = await updateCart(userId, async (draft) => {
    const item = draft.items.id(itemId)
    if (!item) throw itemNotFound()
    if (qty !== undefined) {
      const variant = await findActiveVariant(item.product, item.variantId)
      const available = Math.min(variant.stock, MAX_CART_QTY)
      if (qty > available) {
        throw new ApiError(409, `Only ${variant.stock} available.`, {
          code: 'insufficient_stock',
          details: [{ itemId, available }],
        })
      }
      item.qty = qty
    }
    if (savedForLater !== undefined) item.savedForLater = savedForLater
  })
  return hydrateCart(cart.items)
}

export async function removeItem(userId, itemId) {
  const cart = await updateCart(userId, (draft) => {
    if (!draft.items.id(itemId)) throw itemNotFound()
    draft.items.pull(itemId)
  })
  return hydrateCart(cart.items)
}

function skipReason(match, productId) {
  if (!match || String(match.productId) !== String(productId)) return 'unavailable'
  if (match.variant.stock === 0) return 'out_of_stock'
  return null
}

/**
 * Adds several items with the usual rules (qty capped at stock and MAX_CART_QTY). Items that are
 * unavailable, out of stock, or past the item limit are skipped and reported by variantId.
 */
export async function addItemsToCart(userId, items) {
  const productIds = [...new Set(items.map((item) => String(item.productId)))]
  const products = await Product.find({
    _id: mongoose.trusted({ $in: productIds }),
    status: 'active',
  })
    .select('variants')
    .lean()
  const variantsById = new Map(
    products.flatMap((product) =>
      product.variants
        .filter((variant) => variant.isActive)
        .map((variant) => [String(variant._id), { productId: product._id, variant }]),
    ),
  )

  let skipped = []
  const cart = await updateCart(userId, (draft) => {
    skipped = []
    for (const { productId, variantId, qty, savedForLater = false } of items) {
      const match = variantsById.get(String(variantId))
      const reason =
        skipReason(match, productId) ??
        (addToCart(draft, { productId, variant: match.variant, qty, savedForLater })
          ? null
          : 'cart_full')
      if (reason) skipped.push({ variantId: String(variantId), reason })
    }
  })
  return { cart: await hydrateCart(cart.items), skipped }
}

export async function mergeGuestItems(userId, guestItems) {
  const { cart } = await addItemsToCart(userId, guestItems)
  return cart
}

export function previewGuestItems(guestItems) {
  return hydrateCart(
    guestItems.map((item, index) => ({
      _id: item.variantId,
      product: item.productId,
      variantId: item.variantId,
      qty: item.qty,
      savedForLater: item.savedForLater,
      addedPriceCents: item.addedPriceCents,
      addedAt: new Date(index),
    })),
  )
}

// After a paid order: drops the purchased lines (saved-for-later items stay) and deletes the
// cart if nothing is left.
export async function removePurchasedItems(userId, variantIds, session = null) {
  await Cart.updateOne(
    { user: userId },
    {
      $pull: { items: { variantId: { $in: variantIds }, savedForLater: false } },
      $inc: { __v: 1 },
    },
    { session },
  )
  await Cart.deleteOne({ user: userId, items: mongoose.trusted({ $size: 0 }) }, { session })
}
