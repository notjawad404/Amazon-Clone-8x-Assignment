import Skeleton from '../ui/Skeleton'

export default function ProductSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading product"
      className="mx-auto max-w-page px-3 py-4 sm:px-5"
    >
      <Skeleton className="mb-4 h-4 w-48" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_16rem]">
        <Skeleton className="aspect-square w-full md:row-span-2 lg:row-span-1" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-72 w-full md:col-start-2 lg:col-start-3 lg:row-start-1" />
      </div>
    </div>
  )
}
