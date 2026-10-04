import { useFocusTrap } from '../../hooks/useFocusTrap'
import Icon from './Icon'

export default function Drawer({ isOpen, onClose, label, closeLabel = 'Close menu', children }) {
  const dialogRef = useFocusTrap(isOpen, onClose)

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? 'visible' : 'invisible transition-[visibility] duration-300 motion-reduce:transition-none'}`}
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-black/80 transition-opacity duration-300 motion-reduce:transition-none ${isOpen ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`absolute inset-y-0 left-0 flex items-start transition-transform duration-300 motion-reduce:transition-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-full w-80 max-w-[calc(100vw-3.5rem)] flex-col bg-white shadow-xl">
          {children}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="mt-3 ml-2 cursor-pointer rounded-sm p-1 text-white focus-visible:ring-3 focus-visible:ring-white focus-visible:outline-none"
        >
          <Icon name="close" className="size-7" />
        </button>
      </div>
    </div>
  )
}
