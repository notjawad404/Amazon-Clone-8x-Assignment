import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBuyAgainMutation } from '../../features/orders/ordersApi'
import { parseApiError } from '../../utils/apiError'
import Button from '../ui/Button'

function skippedNotice(skipped) {
  if (!skipped.length) return null
  const list = skipped.map(({ title, reason }) => `${title} (${reason.toLowerCase()})`).join(', ')
  return `Some items couldn’t be added: ${list}.`
}

export default function BuyAgainButton({ orderNumber, className = '' }) {
  const navigate = useNavigate()
  const [buyAgain, { isLoading }] = useBuyAgainMutation()
  const [error, setError] = useState(null)

  async function handleClick() {
    setError(null)
    const result = await buyAgain(orderNumber)
    if (result.error) {
      setError(parseApiError(result.error).message)
      return
    }
    const { addedCount, skipped } = result.data
    if (!addedCount) {
      setError('None of these items can be bought right now.')
      return
    }
    navigate('/cart', { state: { notice: skippedNotice(skipped) } })
  }

  return (
    <div className={className}>
      <Button onClick={handleClick} isLoading={isLoading} className="w-full">
        Buy it again
      </Button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  )
}
