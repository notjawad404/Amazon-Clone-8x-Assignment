import { useId } from 'react'

export default function Input({ label, error, id, className = '', ...props }) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1 block text-sm font-bold">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="w-full rounded-sm border border-gray-400 px-2 py-1.5 text-sm shadow-inner focus:border-focus focus:ring-3 focus:ring-focus/30 focus:outline-none aria-invalid:border-error"
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  )
}
