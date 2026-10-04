import { Types } from 'mongoose'
import { describe, expect, it } from 'vitest'
import { Order } from '../models/index.js'

function pendingOrder() {
  return new Order({ status: 'pending_payment', statusHistory: [{ status: 'pending_payment' }] })
}

describe('Order.transitionTo', () => {
  it('records the timestamp and history for an allowed transition', () => {
    const order = pendingOrder()
    order.reservationExpiresAt = new Date()
    const at = new Date('2026-01-01')

    order.transitionTo('paid', { at })

    expect(order.status).toBe('paid')
    expect(order.paidAt).toEqual(at)
    expect(order.reservationExpiresAt).toBeNull()
    expect(order.statusHistory.map((entry) => entry.status)).toEqual(['pending_payment', 'paid'])
  })

  it('sets the cancel reason when cancelling', () => {
    const order = pendingOrder()

    order.transitionTo('cancelled', { cancelReason: 'reservation_expired' })

    expect(order.cancelReason).toBe('reservation_expired')
  })

  it.each([
    ['pending_payment', 'shipped'],
    ['paid', 'delivered'],
    ['shipped', 'cancelled'],
    ['delivered', 'paid'],
    ['cancelled', 'paid'],
  ])('rejects %s → %s', (from, to) => {
    const order = new Order({ _id: new Types.ObjectId(), status: from })

    expect(() => order.transitionTo(to)).toThrow(/cannot move/)
  })
})
