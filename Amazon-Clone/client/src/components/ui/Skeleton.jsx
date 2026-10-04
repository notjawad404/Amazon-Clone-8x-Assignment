export default function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-sm bg-gray-200 ${className}`} />
}
