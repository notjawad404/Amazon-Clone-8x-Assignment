const SIZES = {
  sm: 'size-4 border-2',
  md: 'size-8 border-3',
  lg: 'size-12 border-4',
}

export default function Spinner({ size = 'md', label = 'Loading', className = '' }) {
  return (
    <span role="status" className={`inline-flex ${className}`}>
      <span
        aria-hidden="true"
        className={`${SIZES[size]} animate-spin rounded-full border-gray-300 border-t-btn-orange`}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}
