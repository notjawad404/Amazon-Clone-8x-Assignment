import Spinner from './Spinner'

const BASE =
  'inline-flex items-center justify-center gap-2 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-focus/40 disabled:cursor-not-allowed disabled:opacity-60'

const VARIANTS = {
  yellow: 'rounded-full bg-btn-yellow px-4 py-2 shadow-sm enabled:hover:bg-btn-yellow-hover',
  orange: 'rounded-full bg-btn-orange px-4 py-2 shadow-sm enabled:hover:bg-btn-orange-hover',
  outline:
    'rounded-full border border-gray-300 bg-white px-4 py-2 shadow-sm enabled:hover:bg-gray-50',
  link: 'rounded-sm text-link enabled:hover:text-link-hover enabled:hover:underline',
}

export default function Button({
  variant = 'yellow',
  type = 'button',
  isLoading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {isLoading && <Spinner size="sm" label="Please wait" />}
      {children}
    </button>
  )
}
