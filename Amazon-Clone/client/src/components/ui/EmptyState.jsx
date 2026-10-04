export default function EmptyState({ title, message, children, className = '' }) {
  return (
    <div className={`rounded-sm bg-white px-6 py-10 text-center ${className}`}>
      <h2 className="text-xl font-bold">{title}</h2>
      {message && <p className="mt-2 text-sm text-gray-700">{message}</p>}
      {children}
    </div>
  )
}
