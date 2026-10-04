import { useState } from 'react'
import { useUpdateCheckoutMutation } from '../../features/checkout/checkoutApi'
import { usePlaceOrder } from '../../hooks/usePlaceOrder'
import { parseApiError } from '../../utils/apiError'
import { formatDeliveryDate } from '../../utils/delivery'
import { formatShipping } from '../../utils/money'
import Alert from '../ui/Alert'
import AddressStep from './AddressStep'
import AddressSummary from './AddressSummary'
import CheckoutSection from './CheckoutSection'
import DeliveryStep from './DeliveryStep'
import OrderSummary from './OrderSummary'
import PaymentStep from './PaymentStep'
import ReviewItemsStep from './ReviewItemsStep'

function DeliverySummary({ checkout }) {
  const option = checkout.deliveryOptions.find((item) => item.method === checkout.deliveryMethod)
  return (
    <p>
      <span className="font-bold text-success">
        {formatDeliveryDate(option.estimatedDelivery, 'long')}
      </span>{' '}
      · {formatShipping(option.priceCents)} {option.label} delivery
    </p>
  )
}

export default function CheckoutForm({ checkout }) {
  const [openStep, setOpenStep] = useState(checkout.shippingAddress ? null : 'address')
  const [isCardComplete, setIsCardComplete] = useState(false)
  const [stepError, setStepError] = useState(null)
  const [updateCheckout, { isLoading: isSaving }] = useUpdateCheckoutMutation()
  const order = usePlaceOrder(checkout)

  const itemCount = checkout.items.reduce((sum, item) => sum + (item.available ? item.qty : 0), 0)
  const hasIssues = checkout.issues.length > 0
  const canPlace =
    Boolean(checkout.shippingAddress) && !hasIssues && !openStep && isCardComplete && order.isReady
  const canEdit = !order.isOrderCreated && !order.isPlacing

  async function save(changes) {
    setStepError(null)
    const result = await updateCheckout({ checkoutId: checkout._id, ...changes })
    if (result.error) setStepError(parseApiError(result.error).message)
    else setOpenStep(null)
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="rounded-lg bg-white px-4 sm:px-6">
        {stepError && <Alert className="mt-4">{stepError}</Alert>}
        <CheckoutSection
          number={1}
          title="Shipping address"
          summary={<AddressSummary address={checkout.shippingAddress} />}
          onChange={canEdit ? () => setOpenStep('address') : null}
        >
          {openStep === 'address' && (
            <AddressStep
              selectedId={checkout.addressId}
              isSaving={isSaving}
              onSelect={(addressId) => save({ addressId })}
            />
          )}
        </CheckoutSection>
        <CheckoutSection
          number={2}
          title="Delivery"
          summary={<DeliverySummary checkout={checkout} />}
          onChange={canEdit ? () => setOpenStep('delivery') : null}
        >
          {openStep === 'delivery' && (
            <DeliveryStep
              options={checkout.deliveryOptions}
              selected={checkout.deliveryMethod}
              isSaving={isSaving}
              onSelect={(deliveryMethod) => save({ deliveryMethod })}
            />
          )}
        </CheckoutSection>
        <CheckoutSection number={3} title="Payment method">
          <PaymentStep onCompleteChange={setIsCardComplete} error={order.error} />
        </CheckoutSection>
        <CheckoutSection number={4} title="Review items">
          <ReviewItemsStep checkout={checkout} />
        </CheckoutSection>
      </div>

      <div className="lg:sticky lg:top-4">
        <OrderSummary
          quote={checkout.quote}
          itemCount={itemCount}
          canPlace={canPlace}
          isPlacing={order.isPlacing}
          onPlace={order.place}
        >
          {order.notice && <Alert variant="info">{order.notice}</Alert>}
          {hasIssues && (
            <Alert title="Some items can’t be ordered">
              Remove them or lower the quantity in your cart to continue.
            </Alert>
          )}
          {order.isOrderCreated && order.error && (
            <p className="text-xs text-gray-700">
              Your order is reserved. Fix your card details and place it again — you won’t be
              charged twice.
            </p>
          )}
        </OrderSummary>
      </div>
    </div>
  )
}
