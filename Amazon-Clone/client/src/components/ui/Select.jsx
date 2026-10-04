import { useId } from 'react'

export default function Select({ label, error, hint, id, className = '', children, ...props }) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = `${selectId}-error`
  const hintId = `${selectId}-hint`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <label htmlFor={selectId} className="mb-1 block text-sm font-bold">
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="h-10 w-full cursor-pointer rounded-md border border-gray-500 bg-gray-50 px-2 text-sm shadow-sm focus:border-focus focus:ring-3 focus:ring-focus/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-error"
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="mt-1 flex items-start gap-1 text-xs text-error">
          <span aria-hidden="true" className="font-bold">
            !
          </span>
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-gray-600">
          {hint}
        </p>
      )}
    </div>
  )
}
