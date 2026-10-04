import { useId } from 'react'

export default function CheckoutSection({
  number,
  title,
  summary = null,
  onChange = null,
  children,
}) {
  const headingId = useId()
  const isOpen = Boolean(children)

  return (
    <section aria-labelledby={headingId} className="border-b border-gray-300 py-4 last:border-b-0">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <span className="w-6 shrink-0 text-lg font-bold" aria-hidden="true">
          {number}
        </span>
        <h2
          id={headingId}
          className={`min-w-0 flex-1 text-lg font-bold sm:w-44 sm:flex-none ${isOpen ? 'text-link-hover' : ''}`}
        >
          {title}
        </h2>
        {!isOpen && (
          <div className="order-last w-full pl-10 text-sm sm:order-none sm:w-auto sm:min-w-0 sm:flex-1 sm:pl-0">
            {summary}
          </div>
        )}
        {!isOpen && onChange && (
          <button
            type="button"
            onClick={onChange}
            aria-label={`Change ${title.toLowerCase()}`}
            className="cursor-pointer rounded-sm text-sm text-link hover:text-link-hover hover:underline focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none"
          >
            Change
          </button>
        )}
      </div>
      {isOpen && <div className="mt-3 sm:pl-10">{children}</div>}
    </section>
  )
}
