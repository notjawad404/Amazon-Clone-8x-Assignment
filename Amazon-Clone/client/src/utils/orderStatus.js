import { formatDeliveryDate } from './delivery'

export const STATUS_LABELS = {
  pending_payment: 'Payment pending',
  paid: 'Preparing for shipment',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

// An unpaid order is described by where its payment stands.
const PAYMENT_STATE_LABELS = {
  awaiting: 'Payment pending',
  confirming: 'Confirming payment',
  failed: 'Payment failed',
}

const PAYMENT_STATE_TEXT = {
  awaiting: 'Waiting for your payment',
  confirming: 'We’re confirming your payment',
  failed: 'Your payment didn’t go through',
}

const dayFormat = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' })
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' })
const dateTimeFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

export const formatOrderDate = (iso) => dateFormat.format(new Date(iso))
export const formatOrderDateTime = (iso) => dateTimeFormat.format(new Date(iso))

export function statusLabel(order) {
  if (order.status === 'pending_payment') {
    return PAYMENT_STATE_LABELS[order.paymentState] ?? STATUS_LABELS.pending_payment
  }
  return STATUS_LABELS[order.status]
}

/** The shopper can still pay: nothing is being confirmed and the order isn't settled. */
export function needsPayment(order) {
  return order.status === 'pending_payment' && order.paymentState !== 'confirming'
}

/** The one-line delivery status shown above an order's items. */
export function deliveryText(order) {
  switch (order.status) {
    case 'delivered':
      return `Delivered ${dayFormat.format(new Date(order.deliveredAt))}`
    case 'shipped':
    case 'paid':
      return `Arriving ${formatDeliveryDate(order.estimatedDelivery, 'long')}`
    case 'pending_payment':
      return PAYMENT_STATE_TEXT[order.paymentState] ?? PAYMENT_STATE_TEXT.awaiting
    default:
      return order.paymentStatus === 'refunded' ? 'Cancelled · Refunded' : 'Cancelled'
  }
}
