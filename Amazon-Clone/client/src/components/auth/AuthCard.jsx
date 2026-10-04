export default function AuthCard({ title, children, footer }) {
  return (
    <section className="rounded-lg border-gray-300 py-5 sm:border sm:px-8 sm:py-6">
      <h1 className="mb-4 text-[28px] leading-tight font-normal">{title}</h1>
      {children}
      {footer && <div className="mt-6 border-t border-gray-300 pt-5 text-sm">{footer}</div>}
    </section>
  )
}
