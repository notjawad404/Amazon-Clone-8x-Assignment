import { useState } from 'react'
import { imageSrcSet, imageUrl } from '../../utils/cloudinary'
import ImageLightbox from './ImageLightbox'

const MAIN_WIDTH = 500
const THUMB_WIDTH = 48

function Thumbnail({ image, label, isActive, onActivate }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={isActive || undefined}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      onClick={onActivate}
      className={`flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-white p-0.5 focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none ${isActive ? 'border-link ring-2 ring-link/40' : 'border-gray-300'}`}
    >
      <img
        src={imageUrl(image.url, { w: THUMB_WIDTH })}
        srcSet={imageSrcSet(image.url, THUMB_WIDTH)}
        alt=""
        width={THUMB_WIDTH}
        height={THUMB_WIDTH}
        className="size-full object-contain"
      />
    </button>
  )
}

export default function ImageGallery({ images, title }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const active = images[activeIndex] ?? images[0]

  if (!active) {
    return <div className="aspect-square w-full rounded-md bg-gray-100" aria-hidden="true" />
  }

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
          {images.map((image, index) => (
            <li key={image.url}>
              <Thumbnail
                image={image}
                label={`Show image ${index + 1} of ${images.length}`}
                isActive={index === activeIndex}
                onActivate={() => setActiveIndex(index)}
              />
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setIsLightboxOpen(true)}
        aria-label="Open full-size image"
        className="flex aspect-square min-w-0 flex-1 cursor-zoom-in items-center justify-center rounded-md p-2 focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none"
      >
        <img
          src={imageUrl(active.url, { w: MAIN_WIDTH })}
          srcSet={imageSrcSet(active.url, MAIN_WIDTH)}
          alt={active.alt || title}
          width={MAIN_WIDTH}
          height={MAIN_WIDTH}
          fetchPriority="high"
          className="max-h-full w-auto object-contain"
        />
      </button>
      <ImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={images}
        index={activeIndex}
        onIndexChange={setActiveIndex}
        title={title}
      />
    </div>
  )
}
