import { useEffect, useState } from 'react'
import { HERO_AUTOPLAY_MS } from '../../utils/constants'
import HeroSlide from './HeroSlide'

const HERO_SLIDES = [
  {
    id: 'electronics',
    eyebrow: 'New season tech',
    title: 'Upgrade your everyday tech',
    text: 'Phones, laptops and tablets from the brands you trust.',
    cta: 'Shop Electronics',
    to: '/c/electronics',
    theme: 'from-sky-300 via-sky-200 to-indigo-200',
  },
  {
    id: 'fashion',
    eyebrow: 'The fall edit',
    title: 'Fresh looks for cooler days',
    text: 'Shoes, watches, bags and more for the new season.',
    cta: 'Shop Fashion',
    to: '/c/fashion',
    theme: 'from-amber-300 via-orange-200 to-rose-200',
  },
  {
    id: 'home',
    eyebrow: 'Home refresh',
    title: 'Make your space feel new',
    text: 'Furniture, décor and kitchen favorites for every room.',
    cta: 'Shop Home & Kitchen',
    to: '/c/home-kitchen',
    theme: 'from-emerald-300 via-teal-200 to-cyan-100',
  },
  {
    id: 'grocery',
    eyebrow: 'Stock your pantry',
    title: 'Everyday essentials, delivered',
    text: 'Snacks, staples and gourmet treats at great prices.',
    cta: 'Shop Grocery',
    to: '/c/grocery',
    theme: 'from-lime-300 via-yellow-200 to-amber-100',
  },
]

const ARROW_CLASS =
  'absolute top-0 z-10 flex h-64 w-14 cursor-pointer items-center justify-center text-5xl text-ink/80 hover:text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-focus/60 sm:h-72 lg:h-60'

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export default function HeroCarousel() {
  const [index, setIndex] = useState(0)
  const [isPausedByUser, setIsPausedByUser] = useState(prefersReducedMotion)
  const [isHovered, setIsHovered] = useState(false)
  const [hasFocus, setHasFocus] = useState(false)
  const isRotating = !isPausedByUser && !isHovered && !hasFocus
  const slideCount = HERO_SLIDES.length

  useEffect(() => {
    if (!isRotating) return undefined
    const timer = setTimeout(() => setIndex((i) => (i + 1) % slideCount), HERO_AUTOPLAY_MS)
    return () => clearTimeout(timer)
  }, [isRotating, index, slideCount])

  const showPrevious = () => setIndex((i) => (i - 1 + slideCount) % slideCount)
  const showNext = () => setIndex((i) => (i + 1) % slideCount)

  function handleKeyDown(event) {
    if (event.key === 'ArrowLeft') showPrevious()
    if (event.key === 'ArrowRight') showNext()
  }

  function handleBlur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false)
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setHasFocus(true)}
      onBlur={handleBlur}
      className="relative h-64 overflow-hidden sm:h-72 lg:h-150"
    >
      <div
        aria-live={isRotating ? 'off' : 'polite'}
        className="flex h-full motion-safe:transition-transform motion-safe:duration-700"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {HERO_SLIDES.map((slide, i) => (
          <HeroSlide
            key={slide.id}
            slide={slide}
            isActive={i === index}
            label={`${i + 1} of ${slideCount}`}
            onKeyDown={handleKeyDown}
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-b from-transparent to-page lg:h-3/5"
      />

      <button
        type="button"
        onClick={showPrevious}
        onKeyDown={handleKeyDown}
        aria-label="Previous slide"
        className={`${ARROW_CLASS} left-0`}
      >
        <span aria-hidden="true">‹</span>
      </button>
      <button
        type="button"
        onClick={showNext}
        onKeyDown={handleKeyDown}
        aria-label="Next slide"
        className={`${ARROW_CLASS} right-0`}
      >
        <span aria-hidden="true">›</span>
      </button>
      <button
        type="button"
        onClick={() => setIsPausedByUser((paused) => !paused)}
        aria-label={isPausedByUser ? 'Play slideshow' : 'Pause slideshow'}
        className="absolute top-4 right-16 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-xs text-white hover:bg-ink focus-visible:ring-3 focus-visible:ring-focus/60 focus-visible:outline-none"
      >
        <span aria-hidden="true">{isPausedByUser ? '▶' : '❚❚'}</span>
      </button>
    </section>
  )
}
