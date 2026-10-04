import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductCardCompact from '../product/ProductCardCompact'
import Skeleton from '../ui/Skeleton'

const SKELETON_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7']
const SCROLL_FRACTION = 0.9

const TONES = {
  plain: { section: 'bg-white', heading: 'text-ink', item: '' },
  promo: { section: 'bg-promo', heading: 'text-white', item: 'rounded-sm bg-white p-2' },
}

function ArrowButton({ direction, onClick, disabled }) {
  const isNext = direction === 'next'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isNext ? 'Scroll right' : 'Scroll left'}
      className={`absolute top-1/2 z-10 hidden h-24 w-11 -translate-y-1/2 cursor-pointer items-center justify-center bg-white/95 text-2xl opacity-0 shadow-md transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none disabled:invisible md:flex ${isNext ? 'right-0 rounded-l-md' : 'left-0 rounded-r-md'}`}
    >
      <span aria-hidden="true">{isNext ? '›' : '‹'}</span>
    </button>
  )
}

function RowSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" aria-hidden="true">
      {SKELETON_KEYS.map((key) => (
        <div key={key} className="w-36 shrink-0 sm:w-44">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-2 h-5 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export default function ProductRow({
  title,
  products = [],
  isLoading = false,
  isDeal = false,
  tone = 'plain',
  seeAllTo = null,
}) {
  const trackRef = useRef(null)
  const [edges, setEdges] = useState({ atStart: true, atEnd: true })
  const styles = TONES[tone]

  const updateEdges = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    setEdges({
      atStart: track.scrollLeft <= 1,
      atEnd: track.scrollLeft + track.clientWidth >= track.scrollWidth - 1,
    })
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    const observer = new ResizeObserver(updateEdges)
    observer.observe(track)
    return () => observer.disconnect()
  }, [updateEdges, products])

  function scrollByPage(direction) {
    const track = trackRef.current
    track.scrollBy({ left: direction * track.clientWidth * SCROLL_FRACTION })
  }

  if (!isLoading && !products.length) return null

  return (
    <section
      aria-label={isLoading ? 'Loading products' : undefined}
      className={`${styles.section} px-5 py-4`}
    >
      {isLoading ? (
        <Skeleton className="mb-3 h-6 w-56" />
      ) : (
        <div className="mb-3 flex items-baseline gap-4">
          <h2 className={`text-xl font-bold ${styles.heading}`}>{title}</h2>
          {seeAllTo && (
            <Link
              to={seeAllTo}
              className={`text-sm hover:underline ${tone === 'promo' ? 'text-white' : 'text-link hover:text-link-hover'}`}
            >
              See more
            </Link>
          )}
        </div>
      )}

      {isLoading ? (
        <RowSkeleton />
      ) : (
        <div className="group/row relative">
          <ArrowButton direction="prev" onClick={() => scrollByPage(-1)} disabled={edges.atStart} />
          <ul
            ref={trackRef}
            onScroll={updateEdges}
            className="relative flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto pb-1 motion-safe:scroll-smooth"
          >
            {products.map((product) => (
              <li key={product._id} className={`w-36 shrink-0 snap-start sm:w-44 ${styles.item}`}>
                <ProductCardCompact product={product} isDeal={isDeal} />
              </li>
            ))}
          </ul>
          <ArrowButton direction="next" onClick={() => scrollByPage(1)} disabled={edges.atEnd} />
        </div>
      )}
    </section>
  )
}
