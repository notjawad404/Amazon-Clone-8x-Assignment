import { useState } from 'react'
import { formatDeliveryDate } from '../../utils/delivery'
import { formatShipping } from '../../utils/money'
import Button from '../ui/Button'

export default function DeliveryStep({ options, selected, onSelect, isSaving }) {
  const [choice, setChoice] = useState(selected)

  return (
    <div className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="sr-only">Delivery speed</legend>
        {options.map(({ method, label, priceCents, estimatedDelivery }) => (
          <label key={method} className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="radio"
              name="delivery"
              value={method}
              checked={choice === method}
              onChange={() => setChoice(method)}
              className="mt-1 accent-link"
            />
            <span>
              <span className="font-bold text-success">
                {formatDeliveryDate(estimatedDelivery, 'long')}
              </span>
              <br />
              {formatShipping(priceCents)} · {label} delivery
            </span>
          </label>
        ))}
      </fieldset>
      <Button onClick={() => onSelect(choice)} isLoading={isSaving}>
        Continue
      </Button>
    </div>
  )
}
