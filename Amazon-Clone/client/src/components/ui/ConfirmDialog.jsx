import Button from './Button'
import Modal from './Modal'

export default function ConfirmDialog({
  isOpen,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Keep it',
  isConfirming = false,
  error = null,
  onConfirm,
  onClose,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} label={title}>
      <div className="max-w-md space-y-3">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="text-sm">{children}</div>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} isLoading={isConfirming}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
