import { describe, expect, it } from 'vitest'
import {
  calculateQuote,
  calculateShippingCents,
  freeDeliveryDate,
} from '../services/pricing.service.js'

describe('calculateShippingCents', () => {
  it('charges standard shipping below $35 and makes it free from $35', () => {
    expect(calculateShippingCents(3499, 'standard')).toBe(599)
    expect(calculateShippingCents(3500, 'standard')).toBe(0)
  })

  it('always charges for faster delivery', () => {
    expect(calculateShippingCents(10_000, 'expedited')).toBe(999)
    expect(calculateShippingCents(10_000, 'nextday')).toBe(1499)
  })
})

describe('calculateQuote', () => {
  it('adds subtotal, shipping, and 8% tax rounded once', () => {
    const quote = calculateQuote({
      items: [
        { unitPriceCents: 999, qty: 2 },
        { unitPriceCents: 1001, qty: 1 },
      ],
      deliveryMethod: 'standard',
      now: new Date('2026-10-02T12:00:00Z'),
    })

    expect(quote).toMatchObject({
      subtotalCents: 2999,
      shippingCents: 599,
      taxCents: 240,
      totalCents: 3838,
    })
  })

  it('counts only business days for the delivery estimate', () => {
    const friday = new Date('2026-10-02T12:00:00Z')
    const quote = calculateQuote({ items: [{ unitPriceCents: 100, qty: 1 }], now: friday })

    expect(quote.estimatedDelivery.toISOString().slice(0, 10)).toBe('2026-10-09')
  })
})

describe('freeDeliveryDate', () => {
  it('gives the standard delivery date only from $35', () => {
    const friday = new Date('2026-10-02T12:00:00Z')

    expect(freeDeliveryDate(3499, friday)).toBeNull()
    expect(freeDeliveryDate(3500, friday)).toEqual(new Date('2026-10-09T12:00:00Z'))
  })
})
