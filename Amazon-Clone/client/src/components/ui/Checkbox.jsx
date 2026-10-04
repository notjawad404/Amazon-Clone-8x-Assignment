export default function Checkbox({ label, className = '', ...props }) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 text-sm ${className}`}>
      <input type="checkbox" className="size-4 accent-link" {...props} />
      {label}
    </label>
  )
}
