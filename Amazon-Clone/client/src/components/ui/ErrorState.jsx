import Button from './Button'

export default function ErrorState({
  title = 'Something went wrong',
  message = 'We couldn’t load this page. Please try again.',
  onRetry,
  isRetrying = false,
  className = '',
}) {
  return (
    <div role="alert" className={`rounded-sm bg-white px-6 py-10 text-center ${className}`}>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-gray-700">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} isLoading={isRetrying} className="mt-5">
          Try again
        </Button>
      )}
    </div>
  )
}
