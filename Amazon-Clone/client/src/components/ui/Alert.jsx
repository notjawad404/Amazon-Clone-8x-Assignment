const VARIANTS = {
  error: { box: 'border-error', icon: 'bg-error', title: 'text-error', symbol: '!' },
  info: { box: 'border-link', icon: 'bg-link', title: 'text-link', symbol: 'i' },
}

export default function Alert({ title, variant = 'error', className = '', children }) {
  const styles = VARIANTS[variant]

  return (
    <div
      role="alert"
      className={`flex gap-3 rounded-lg border-2 px-4 py-3 text-sm${styles.box} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${styles.icon}`}
      >
        {styles.symbol}
      </span>
      <div>
        {title && <p className={`font-bold ${styles.title}`}>{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}
