import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { apiSlice } from '../features/api/apiSlice'
import { useGetOrderQuery } from '../features/orders/ordersApi'
import { ORDER_CONFIRM_TIMEOUT_MS, ORDER_POLL_INTERVAL_MS } from '../utils/constants'

/**
 * Loads the order and polls while its payment is being confirmed, for up to 20 s per attempt.
 * `view` is one of: placed, cancelled, failed, confirming, stillConfirming.
 */
export function useOrderConfirmation(orderNumber, { justPaid = false } = {}) {
  const dispatch = useDispatch()
  const [isTimedOut, setIsTimedOut] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // Failures already known when a payment was submitted; only a newer one is shown as an error.
  const [failuresAtSubmit, setFailuresAtSubmit] = useState(null)

  const result = useGetOrderQuery(orderNumber)
  const order = result.currentData
  const isPending = order?.status === 'pending_payment'
  const isPlaced = Boolean(order) && !isPending && order.status !== 'cancelled'
  useGetOrderQuery(orderNumber, {
    skip: !isPending || isTimedOut,
    pollingInterval: ORDER_POLL_INTERVAL_MS,
  })

  if (justPaid && order && failuresAtSubmit === null) {
    setFailuresAtSubmit(order.payment?.failedAttempts ?? 0)
  }

  useEffect(() => {
    if (!isPending || isTimedOut) return undefined
    const timer = setTimeout(() => setIsTimedOut(true), ORDER_CONFIRM_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [isPending, isTimedOut, attempt])

  // The webhook removed the bought items from the cart; refresh the header count.
  useEffect(() => {
    if (isPlaced) dispatch(apiSlice.util.invalidateTags(['Cart']))
  }, [isPlaced, dispatch])

  function onPaymentSubmitted() {
    setFailuresAtSubmit(order?.payment?.failedAttempts ?? 0)
    setIsTimedOut(false)
    setAttempt((count) => count + 1)
    result.refetch()
  }

  const payment = order?.payment
  const hasNewFailure =
    Boolean(payment?.lastError) &&
    (failuresAtSubmit === null || payment.failedAttempts > failuresAtSubmit)

  let view = null
  if (order?.status === 'cancelled') view = 'cancelled'
  else if (isPlaced) view = 'placed'
  else if (isPending && hasNewFailure) view = 'failed'
  else if (isPending) view = isTimedOut ? 'stillConfirming' : 'confirming'

  return { ...result, order, view, onPaymentSubmitted }
}
