import { useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import RetryPayment from './RetryPayment'

const timeFormat = new Intl.DateTimeFormat('en-US', { timeStyle: 'short' })

function ReservedUntil({ order }) {
  if (!order.reservationExpiresAt) return null
  return (
    <p className="text-sm text-gray-700">
      Your items are reserved until {timeFormat.format(new Date(order.reservationExpiresAt))}.
    </p>
  )
}

export function Confirming() {
  return (
    <div role="status" className="flex flex-col items-center gap-3 rounded-lg bg-white px-6 py-12">
      <Spinner size="lg" label="Confirming your payment" />
      <p className="text-lg">Confirming your payment…</p>
      <p className="text-sm text-gray-600">This usually takes a few seconds.</p>
    </div>
  )
}

export function PaymentFailed({ order, onRetried }) {
  return (
    <div className="space-y-4 rounded-lg bg-white p-5">
      <h1 className="text-xl font-bold">Your payment didn’t go through</h1>
      <Alert title="There was a problem with your card">{order.payment.lastError.message}</Alert>
      <ReservedUntil order={order} />
      <h2 className="text-base font-bold">Try another card</h2>
      <RetryPayment order={order} onSubmitted={onRetried} />
    </div>
  )
}

export function StillConfirming({ order, onRetried }) {
  const [isPayingAgain, setIsPayingAgain] = useState(false)

  return (
    <div className="space-y-4 rounded-lg bg-white p-5">
      <h1 className="text-xl font-bold">We’re still confirming your payment</h1>
      <p className="text-sm">
        This can take a little longer. You’ll find the latest status in{' '}
        <Link to="/orders" className="text-link hover:text-link-hover hover:underline">
          Your Orders
        </Link>
        . You won’t be charged twice.
      </p>
      <ReservedUntil order={order} />
      {isPayingAgain ? (
        <RetryPayment order={order} onSubmitted={onRetried} />
      ) : (
        <Button variant="outline" onClick={() => setIsPayingAgain(true)}>
          Didn’t finish paying? Pay with a card
        </Button>
      )}
    </div>
  )
}
