import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { apiSlice } from '../features/api/apiSlice'
import {
  usePlaceOrderMutation,
  useRetryPaymentIntentMutation,
} from '../features/checkout/checkoutApi'
import { checkoutFinished } from '../features/checkout/checkoutSlice'
import { parseApiError } from '../utils/apiError'
import { formatCents } from '../utils/money'

const SETTLED = ['succeeded', 'processing']

/**
 * Place → confirm card → confirmation page. After a decline the order and its PaymentIntent are
 * kept, so "Place your order" retries the same payment instead of creating another order.
 */
export function usePlaceOrder(checkout) {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [placeOrder] = usePlaceOrderMutation()
  const [retryPaymentIntent] = useRetryPaymentIntentMutation()
  const [payment, setPayment] = useState(null)
  const [status, setStatus] = useState({ isPlacing: false, error: null, notice: null })

  function finish(orderNumber) {
    dispatch(checkoutFinished())
    dispatch(apiSlice.util.invalidateTags(['Cart']))
    navigate(`/order/${orderNumber}/confirmation`, { replace: true })
  }

  function fetchPayment() {
    if (payment?.clientSecret) return payment
    if (payment?.orderNumber) return retryPaymentIntent(payment.orderNumber).unwrap()
    return placeOrder({
      checkoutId: checkout._id,
      expectedTotalCents: checkout.quote.totalCents,
    }).unwrap()
  }

  function handleApiError(err) {
    const { code, details, message } = err?.data ?? {}
    if (code === 'price_changed') {
      dispatch(apiSlice.util.invalidateTags(['Checkout']))
      const total = formatCents(details.quote.totalCents)
      return { notice: `Your order total changed to ${total}. Review it, then place your order.` }
    }
    if ((code === 'out_of_stock' || code === 'unavailable') && checkout.source === 'cart') {
      navigate('/cart', { state: { notice: `${message} Update your cart, then check out again.` } })
      return null
    }
    if (code === 'out_of_stock' || code === 'unavailable') {
      dispatch(apiSlice.util.invalidateTags(['Checkout']))
    }
    if (code === 'payment_unavailable') setPayment({ orderNumber: details.orderNumber })
    return { error: parseApiError(err).message }
  }

  async function place() {
    if (!stripe || !elements || status.isPlacing) return
    setStatus({ isPlacing: true, error: null, notice: null })
    try {
      const nextPayment = await fetchPayment()
      setPayment(nextPayment)
      if (SETTLED.includes(nextPayment.paymentStatus)) return finish(nextPayment.orderNumber)

      const { error } = await stripe.confirmCardPayment(nextPayment.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { name: checkout.shippingAddress.fullName },
        },
      })
      if (error) {
        setStatus({ isPlacing: false, error: error.message, notice: null })
        return undefined
      }
      return finish(nextPayment.orderNumber)
    } catch (err) {
      const result = handleApiError(err)
      if (result) setStatus({ isPlacing: false, error: null, notice: null, ...result })
      return undefined
    }
  }

  return { place, ...status, isOrderCreated: Boolean(payment), isReady: Boolean(stripe) }
}
