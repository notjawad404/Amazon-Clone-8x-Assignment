import { formatCents, splitCents } from '../../utils/money'

const SIZES = {
  sm: { amount: 'text-xl', symbol: 'text-xs' },
  md: { amount: 'text-3xl', symbol: 'text-sm' },
}

export default function Price({ priceCents, listPriceCents = null, size = 'sm', className = '' }) {
  const { dollars, cents } = splitCents(priceCents)
  const styles = SIZES[size]

  return (
    <div className={`flex flex-wrap items-baseline gap-x-1.5 ${className}`}>
      <span className="sr-only">{formatCents(priceCents)}</span>
      <span aria-hidden="true" className={`leading-none ${styles.amount}`}>
        <span className={`align-top ${styles.symbol}`}>$</span>
        {dollars}
        <span className={`align-top ${styles.symbol}`}>{cents}</span>
      </span>
      {listPriceCents > priceCents && (
        <span className="text-xs text-gray-600">
          <span className="sr-only">List price:</span>
          <s>{formatCents(listPriceCents)}</s>
        </span>
      )}
    </div>
  )
}
