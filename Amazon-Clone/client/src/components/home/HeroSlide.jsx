import { Link } from 'react-router-dom'

export default function HeroSlide({ slide, isActive, label, onKeyDown }) {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={label}
      inert={!isActive}
      className={`relative h-full w-full shrink-0 overflow-hidden bg-linear-to-r ${slide.theme}`}
    >
      <div
        aria-hidden="true"
        className="absolute -top-24 right-[8%] size-96 rounded-full bg-white/30"
      />
      <div
        aria-hidden="true"
        className="absolute top-20 right-[30%] size-40 rounded-full bg-white/25"
      />
      <div className="relative mx-auto max-w-page px-16 pt-6 sm:pt-10 lg:px-24 lg:pt-12">
        <p className="text-sm font-bold tracking-wide uppercase">{slide.eyebrow}</p>
        <p className="mt-1 max-w-3xl text-2xl leading-tight font-bold sm:text-4xl lg:text-5xl">
          {slide.title}
        </p>
        <p className="mt-2 hidden max-w-xl text-lg sm:block lg:text-xl">{slide.text}</p>
        <Link
          to={slide.to}
          onKeyDown={onKeyDown}
          className="mt-4 inline-block rounded-full bg-ink px-5 py-2 text-sm font-bold text-white hover:bg-nav-light focus-visible:ring-3 focus-visible:ring-focus/60 focus-visible:outline-none"
        >
          {slide.cta}
        </Link>
      </div>
    </div>
  )
}
