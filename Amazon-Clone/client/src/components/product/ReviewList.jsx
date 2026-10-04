import { useRef, useState } from 'react'
import { useGetReviewsQuery } from '../../features/catalog/catalogApi'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import ErrorState from '../ui/ErrorState'
import Skeleton from '../ui/Skeleton'
import StarRating from '../ui/StarRating'

const SKELETON_KEYS = ['r1', 'r2', 'r3']
const REVIEW_SORTS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'top', label: 'Top reviews' },
]

const reviewDate = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' })

function Review({ review }) {
  return (
    <article className="border-b border-gray-200 py-4 last:border-b-0">
      <div className="flex items-center gap-2 text-sm">
        <span aria-hidden="true" className="size-8 rounded-full bg-gray-200" />
        {review.authorName}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <StarRating value={review.rating} />
        {review.title && <h3 className="text-sm font-bold">{review.title}</h3>}
      </div>
      <p className="mt-1 text-sm text-gray-600">
        Reviewed on {reviewDate.format(new Date(review.createdAt))}
        {review.verifiedPurchase && (
          <span className="ml-2 text-xs font-bold text-link-hover">Verified Purchase</span>
        )}
      </p>
      <p className="mt-2 text-sm whitespace-pre-line">{review.body}</p>
    </article>
  )
}

function ReviewsSkeleton() {
  return (
    <div aria-hidden="true">
      {SKELETON_KEYS.map((key) => (
        <div key={key} className="py-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-2 h-12 w-full" />
        </div>
      ))}
    </div>
  )
}

export default function ReviewList({ slug }) {
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState('recent')
  const headingRef = useRef(null)
  const { currentData, isError, isFetching, refetch } = useGetReviewsQuery({ slug, page, sort })

  function changePage(next) {
    setPage(next)
    headingRef.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 ref={headingRef} className="scroll-mt-4 text-lg font-bold">
          Reviews
        </h3>
        <label className="flex items-center gap-2 text-sm">
          Sort by
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value)
              setPage(1)
            }}
            className="cursor-pointer rounded-lg border border-gray-300 bg-gray-100 px-2 py-1 shadow-sm focus:ring-3 focus:ring-focus/40 focus:outline-none"
          >
            {REVIEW_SORTS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!currentData && !isError && <ReviewsSkeleton />}
      {isError && (
        <ErrorState
          title="We couldn’t load the reviews"
          onRetry={refetch}
          isRetrying={isFetching}
        />
      )}
      {currentData && !currentData.items.length && (
        <EmptyState title="No reviews yet" className="mt-3 border border-gray-200" />
      )}
      {currentData?.items.length > 0 && (
        <>
          {currentData.items.map((review) => (
            <Review key={review._id} review={review} />
          ))}
          {currentData.pages > 1 && (
            <nav aria-label="Review pages" className="mt-4 flex items-center gap-3">
              <Button variant="outline" onClick={() => changePage(page - 1)} disabled={page <= 1}>
                ‹ Previous
              </Button>
              <span className="text-sm">
                Page {currentData.page} of {currentData.pages}
              </span>
              <Button
                variant="outline"
                onClick={() => changePage(page + 1)}
                disabled={page >= currentData.pages}
              >
                Next ›
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
