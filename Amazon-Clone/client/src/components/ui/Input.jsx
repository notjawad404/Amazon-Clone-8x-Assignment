import { useId } from 'react'

export default function Input({ label, error, hint, id, className = '', ...props }) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1 block text-sm font-bold">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="h-10 w-full rounded-md border border-gray-500 px-3 text-sm shadow-inner focus:border-focus focus:ring-3 focus:ring-focus/30 focus:outline-none aria-invalid:border-error aria-invalid:focus:ring-error/20"
        {...props}
      />
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
