import { useSelector } from 'react-redux'
import { selectGuestCartItems } from '../features/cart/guestCartSlice'

export function useCart() {
  const items = useSelector(selectGuestCartItems)
  const count = items
    .filter((item) => !item.savedForLater)
    .reduce((total, item) => total + item.qty, 0)

  return { count }
}
