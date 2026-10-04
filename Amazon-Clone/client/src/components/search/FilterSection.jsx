import { useId } from 'react'
import { FILTER_LINK } from './filterStyles'

export default function FilterSection({ title, onClear = null, children }) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="border-b border-gray-200 py-3 last:border-b-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <h2 id={headingId} className="text-sm font-bold">
          {title}
        </h2>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${title}`}
            className={`${FILTER_LINK} cursor-pointer text-xs`}
          >
            Clear
          </button>
        )}
      </div>
      {children}
    </section>
  )
}
