const STAR_PATH = 'M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z'
const STARS = [1, 2, 3, 4, 5]

function Star({ fill }) {
  return (
    <span className="relative inline-block size-4">
      <svg viewBox="0 0 20 20" className="absolute inset-0 size-4 text-star">
        <path d={STAR_PATH} fill="white" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill}%` }}>
        <svg viewBox="0 0 20 20" className="size-4 text-star">
          <path d={STAR_PATH} fill="currentColor" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </span>
    </span>
  )
}

export default function StarRating({ value, count = null }) {
  const rounded = Math.round(value * 2) / 2

  return (
    <div className="flex items-center gap-1 text-sm">
      <span role="img" aria-label={`${rounded} out of 5 stars`} className="flex">
        {STARS.map((star) => (
          <Star key={star} fill={Math.min(Math.max(rounded - star + 1, 0), 1) * 100} />
        ))}
      </span>
      {count !== null && (
        <span className="text-link">
          {count.toLocaleString('en-US')}
          <span className="sr-only"> ratings</span>
        </span>
      )}
    </div>
  )
}
