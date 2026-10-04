import { useEffect, useRef } from 'react'
import Icon from './Icon'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableIn(container) {
  return [...container.querySelectorAll(FOCUSABLE)].filter((element) => !element.closest('[inert]'))
}

function trapTab(event, container) {
  const elements = focusableIn(container)
  if (!elements.length) return
  const first = elements[0]
  const last = elements.at(-1)
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

export default function Drawer({ isOpen, onClose, label, closeLabel = 'Close menu', children }) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!isOpen) return undefined
    const dialog = dialogRef.current
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    focusableIn(dialog)[0]?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key === 'Tab') trapTab(event, dialog)
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (opener?.isConnected) opener.focus()
    }
  }, [isOpen])

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
