import { useEffect, useEffectEvent, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectIsMergingGuestCart } from '../features/cart/guestCartSlice'
import { useGetCheckoutQuery, useStartCheckoutMutation } from '../features/checkout/checkoutApi'
import {
  cartCheckoutRequested,
  checkoutStarted,
  selectCheckoutState,
} from '../features/checkout/checkoutSlice'

/**
 * Restores the checkout in sessionStorage (a reload) or starts a new one from the Buy Now item
 * or the cart. A guest cart that is still being merged after sign in is waited for first.
 */
export function useCheckoutSession() {
  const dispatch = useDispatch()
  const { checkoutId, buyNowItem } = useSelector(selectCheckoutState)
  const isMerging = useSelector(selectIsMergingGuestCart)
  const [startCheckout, start] = useStartCheckoutMutation()
  const saved = useGetCheckoutQuery(checkoutId, { skip: !checkoutId })
  const isStarting = useRef(false)

  async function begin() {
    if (isStarting.current) return
    isStarting.current = true
    const body = buyNowItem ? { source: 'buy_now', item: buyNowItem } : { source: 'cart' }
    try {
      const checkout = await startCheckout(body).unwrap()
      dispatch(checkoutStarted(checkout._id))
    } catch {
      // Shown through `start.error`.
    } finally {
      isStarting.current = false
    }
  }

  // Starts automatically once; after a failure the user retries from the error state.
  const beginOnce = useEffectEvent(begin)
  useEffect(() => {
    if (!checkoutId && !isMerging) beginOnce()
  }, [checkoutId, isMerging])

  // An expired or deleted checkout: start over.
  const isGone = saved.error?.status === 404
  useEffect(() => {
    if (isGone) dispatch(cartCheckoutRequested())
  }, [isGone, dispatch])

  const error = checkoutId ? (isGone ? null : saved.error) : start.error
  return {
    checkout: checkoutId ? (saved.currentData ?? null) : null,
    error: error ?? null,
    isRetrying: start.isLoading || saved.isFetching,
    retry: checkoutId ? saved.refetch : begin,
  }
}
