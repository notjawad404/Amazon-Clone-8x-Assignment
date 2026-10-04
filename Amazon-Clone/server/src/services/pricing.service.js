import { DELIVERY_METHODS, FREE_SHIPPING_THRESHOLD_CENTS, TAX_RATE } from '../utils/constants.js'
import { addBusinessDays } from '../utils/dates.js'

export function calculateSubtotalCents(items) {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.qty, 0)
}

export function calculateShippingCents(subtotalCents, deliveryMethod) {
  if (deliveryMethod === 'standard' && subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS) return 0
  return DELIVERY_METHODS[deliveryMethod].priceCents
}

export function freeShippingRemainingCents(subtotalCents) {
  return Math.max(FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents, 0)
}

export function standardDelivery(subtotalCents, now = new Date()) {
  return {
    shippingCents: calculateShippingCents(subtotalCents, 'standard'),
    estimatedDelivery: addBusinessDays(now, DELIVERY_METHODS.standard.businessDays),
  }
}

export function freeDeliveryDate(subtotalCents, now = new Date()) {
  const { shippingCents, estimatedDelivery } = standardDelivery(subtotalCents, now)
  return shippingCents === 0 ? estimatedDelivery : null
}

export function calculateTaxCents(subtotalCents) {
  return Math.round(subtotalCents * TAX_RATE)
}

export function calculateQuote({ items, deliveryMethod = 'standard', now = new Date() }) {
  const subtotalCents = calculateSubtotalCents(items)
  const shippingCents = calculateShippingCents(subtotalCents, deliveryMethod)
  const taxCents = calculateTaxCents(subtotalCents)

  return {
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents: subtotalCents + shippingCents + taxCents,
    estimatedDelivery: addBusinessDays(now, DELIVERY_METHODS[deliveryMethod].businessDays),
    computedAt: now,
  }
}

export function deliveryOptions(subtotalCents, now = new Date()) {
  return Object.entries(DELIVERY_METHODS).map(([method, { label, businessDays }]) => ({
    method,
    label,
    priceCents: calculateShippingCents(subtotalCents, method),
    estimatedDelivery: addBusinessDays(now, businessDays),
  }))
}
