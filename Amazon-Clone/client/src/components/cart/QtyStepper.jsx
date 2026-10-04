import Icon from '../ui/Icon'

const STEP_BUTTON =
  'flex size-8 cursor-pointer items-center justify-center rounded-full enabled:hover:bg-gray-100 focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40'

// At qty 1 the minus button becomes Delete, like Amazon's cart.
export default function QtyStepper({ qty, maxQty, onChange, onDelete, disabled = false }) {
  const isLast = qty <= 1

  return (
    <div
      role="group"
      aria-label="Quantity"
      className="flex w-fit items-center gap-1 rounded-full border-3 border-btn-yellow px-0.5"
    >
      <button
        type="button"
        onClick={isLast ? onDelete : () => onChange(qty - 1)}
        disabled={disabled}
        aria-label={isLast ? 'Delete' : 'Decrease quantity'}
        className={STEP_BUTTON}
      >
        <Icon name={isLast ? 'trash' : 'minus'} className="size-4" />
      </button>
      <span aria-live="polite" className="min-w-6 text-center text-sm font-bold">
        <span className="sr-only">Quantity </span>
        {qty}
      </span>
      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        disabled={disabled || qty >= maxQty}
        aria-label="Increase quantity"
        className={STEP_BUTTON}
      >
        <Icon name="plus" className="size-4" />
      </button>
    </div>
  )
}
