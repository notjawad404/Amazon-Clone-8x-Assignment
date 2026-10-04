import { useFocusTrap } from '../../hooks/useFocusTrap'
import Icon from './Icon'

export default function Modal({ isOpen, onClose, label, children }) {
  const dialogRef = useFocusTrap(isOpen, onClose)
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/80" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative flex max-h-full w-full max-w-5xl flex-col rounded-md bg-white shadow-xl"
      >
        <div className="flex justify-end p-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-sm p-1 focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none"
          >
            <Icon name="close" className="size-6" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">{children}</div>
      </div>
    </div>
  )
}
