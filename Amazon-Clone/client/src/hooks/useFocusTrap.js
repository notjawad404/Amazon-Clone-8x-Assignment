import { useEffect, useRef } from 'react'

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

/**
 * While open: focuses the first control, keeps Tab inside, closes on Esc, and locks body scroll.
 * On close, focus returns to whatever opened it. Attach the returned ref to the dialog element.
 */
export function useFocusTrap(isOpen, onClose) {
  const containerRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!isOpen) return undefined
    const container = containerRef.current
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    focusableIn(container)[0]?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key === 'Tab') trapTab(event, container)
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (opener?.isConnected) opener.focus()
    }
  }, [isOpen])

  return containerRef
}
