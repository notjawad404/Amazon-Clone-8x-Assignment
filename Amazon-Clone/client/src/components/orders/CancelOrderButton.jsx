import { useState } from 'react'
import { useCancelOrderMutation } from '../../features/orders/ordersApi'
import { parseApiError } from '../../utils/apiError'
import { formatCents } from '../../utils/money'
import Button from '../ui/Button'
import ConfirmDialog from '../ui/ConfirmDialog'

export default function CancelOrderButton({ order }) {
  const [isOpen, setIsOpen] = useState(false)
  const [cancelOrder, { isLoading }] = useCancelOrderMutation()
  const [error, setError] = useState(null)
  const isPaid = order.status === 'paid'

  async function confirm() {
    setError(null)
    const result = await cancelOrder(order.orderNumber)
    if (result.error) setError(parseApiError(result.error).message)
    else setIsOpen(false)
  }

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)} className="w-full">
        Cancel order
      </Button>
      <ConfirmDialog
        isOpen={isOpen}
        title="Cancel this order?"
        confirmLabel="Cancel order"
        isConfirming={isLoading}
        error={error}
        onConfirm={confirm}
        onClose={() => setIsOpen(false)}
      >
        {isPaid ? (
          <p>
            You’ll get a full refund of{' '}
            <span className="font-bold">{formatCents(order.totalCents)}</span> to your card. Refunds
            usually show up in 5–10 business days.
          </p>
        ) : (
          <p>Your items will be released and you won’t be charged.</p>
        )}
      </ConfirmDialog>
    </>
  )
}
