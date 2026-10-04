import { useId, useState } from 'react'

const MAX_DIGITS = 3

function errorFor(text, max) {
  const qty = Number(text)
  if (!text || qty < 1) return 'Enter a quantity of at least 1.'
  if (qty > max) return `You can buy up to ${max}.`
  return ''
}

// The parent always receives a quantity from 1 to max; out-of-range text only shows a message.
export default function QtyInput({ value, max, onChange }) {
  const inputId = useId()
  const errorId = `${inputId}-error`
  const [text, setText] = useState(String(value))
  const error = errorFor(text, max)

  function handleChange(event) {
    const digits = event.target.value.replace(/\D/g, '').slice(0, MAX_DIGITS)
    setText(digits)
    if (digits) onChange(Math.min(Math.max(Number(digits), 1), max))
  }

  return (
    <div>
      <div className="flex items-center rounded-lg border border-gray-300 bg-gray-100 text-sm shadow-sm focus-within:ring-3 focus-within:ring-focus/40 has-aria-invalid:border-error">
        <label htmlFor={inputId} className="py-1.5 pl-3">
          Quantity:
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={text}
          onChange={handleChange}
          onBlur={() => setText(String(value))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="w-full min-w-0 bg-transparent py-1.5 pr-3 pl-1 focus:outline-none"
        />
      </div>
      {/* Always rendered so the buttons below don't move when the message clears on blur. */}
      <p id={errorId} role="alert" className="mt-1 min-h-4 text-xs text-error">
        {error}
      </p>
    </div>
  )
}
