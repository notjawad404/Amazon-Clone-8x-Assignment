import { CardElement } from '@stripe/react-stripe-js'
import { useState } from 'react'

const CARD_OPTIONS = {
  hidePostalCode: true,
  style: {
    base: {
      fontSize: '15px',
      fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
      color: '#0f1111',
      '::placeholder': { color: '#6b7280' },
    },
    invalid: { color: '#c40000', iconColor: '#c40000' },
  },
}

// Card details go straight from Stripe's iframe to Stripe; they never touch our state or API.
export default function PaymentStep({ onCompleteChange, error = null }) {
  const [cardError, setCardError] = useState(null)
  const message = cardError ?? error

  function handleChange(event) {
    setCardError(event.error?.message ?? null)
    onCompleteChange(event.complete)
  }

  return (
    <div className="max-w-md space-y-2">
      <p className="text-sm font-bold">Credit or debit card</p>
      <div className="rounded-md border border-gray-500 bg-white px-3 py-3 shadow-inner focus-within:border-focus focus-within:ring-3 focus-within:ring-focus/30">
        <CardElement options={CARD_OPTIONS} onChange={handleChange} />
      </div>
      <p role="alert" className="text-sm text-error empty:hidden">
        {message}
      </p>
      <p className="text-xs text-gray-600">
        Test mode: use 4242 4242 4242 4242 with any future date and any CVC.
      </p>
    </div>
  )
}
