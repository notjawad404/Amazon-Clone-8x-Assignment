import { buttonClasses } from './buttonStyles'
import Spinner from './Spinner'

export default function Button({
  variant = 'yellow',
  type = 'button',
  isLoading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={buttonClasses(variant, className)}
      {...props}
    >
      {isLoading && <Spinner size="sm" label="Please wait" />}
      {children}
    </button>
  )
}
