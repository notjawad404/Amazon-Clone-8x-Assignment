import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js'
import { useState } from 'react'
import { useRetryPaymentIntentMutation } from '../../features/checkout/checkoutApi'
import { parseApiError } from '../../utils/apiError'
import { formatCents } from '../../utils/money'
import { stripePromise } from '../../utils/stripe'
import PaymentStep from '../checkout/PaymentStep'
import Button from '../ui/Button'

const SETTLED = ['succeeded', 'processing']

// Pays the order's existing PaymentIntent again; no new order or charge is created.
function RetryForm({ order, onSubmitted }) {
  const stripe = useStripe()
  const elements = useElements()
  const [retryPaymentIntent] = useRetryPaymentIntentMutation()
  const [isCardComplete, setIsCardComplete] = useState(false)
  const [status, setStatus] = useState({ isPaying: false, error: null })

  async function pay() {
    setStatus({ isPaying: true, error: null })
    try {
      const { clientSecret, paymentStatus } = await retryPaymentIntent(order.orderNumber).unwrap()
      if (!SETTLED.includes(paymentStatus)) {
        const { error } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: { name: order.shippingAddress.fullName },
          },
        })
        if (error) {
          setStatus({ isPaying: false, error: error.message })
          return
        }
      }
      onSubmitted()
    } catch (err) {
      setStatus({ isPaying: false, error: parseApiError(err).message })
      if (parseApiError(err).code === 'order_not_payable') onSubmitted()
    }
  }

  return (
    <div className="space-y-3">
      <PaymentStep onCompleteChange={setIsCardComplete} error={status.error} />
      <Button
        onClick={pay}
        isLoading={status.isPaying}
        disabled={!stripe || !isCardComplete}
        className="px-6"
      >
        Pay {formatCents(order.totalCents)}
      </Button>
    </div>
  )
}

export default function RetryPayment(props) {
  return (
    <Elements stripe={stripePromise}>
      <RetryForm {...props} />
    </Elements>
  )
}
