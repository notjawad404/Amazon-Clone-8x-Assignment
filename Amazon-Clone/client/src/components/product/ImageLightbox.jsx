import { useEffect } from 'react'
import { imageUrl } from '../../utils/cloudinary'
import Icon from '../ui/Icon'
import Modal from '../ui/Modal'

const FULL_WIDTH = 1000
const ARROW_CLASS =
  'absolute top-1/2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-gray-300 bg-white shadow-md hover:bg-gray-50 focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none'

export default function ImageLightbox({ isOpen, onClose, images, index, onIndexChange, title }) {
  const image = images[index]
  const count = images.length
  const hasMany = count > 1

  useEffect(() => {
    if (!isOpen || count < 2) return undefined
    function handleKeyDown(event) {
      const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
      if (direction) onIndexChange((current) => (current + direction + count) % count)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, count, onIndexChange])

  function step(direction) {
    onIndexChange((index + direction + count) % count)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} label={`${title}: images`}>
      <div className="relative flex flex-col items-center gap-3">
        <img
          src={imageUrl(image.url, { w: FULL_WIDTH })}
          alt={image.alt || title}
          className="h-[70vh] w-full object-contain"
        />
        {hasMany && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous image"
              className={`${ARROW_CLASS} left-0`}
            >
              <Icon name="chevron-left" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next image"
              className={`${ARROW_CLASS} right-0`}
            >
              <Icon name="chevron-right" />
            </button>
            <p aria-live="polite" className="text-sm text-gray-700">
              {index + 1} of {images.length}
            </p>
          </>
        )}
      </div>
    </Modal>
  )
}
