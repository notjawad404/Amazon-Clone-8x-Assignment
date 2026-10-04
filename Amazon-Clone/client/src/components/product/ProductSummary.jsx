import { Link } from 'react-router-dom'
import { formatCents } from '../../utils/money'
import { toQueryString } from '../../utils/search'
import Price from '../ui/Price'
import StarRating from '../ui/StarRating'
import AboutThisItem from './AboutThisItem'
import VariantSelector from './VariantSelector'

const LINK_CLASS =
  'rounded-sm text-link hover:text-link-hover hover:underline focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none'

function PriceBlock({ variant }) {
  return (
    <div>
      <div className="flex items-start gap-2">
        {variant.discountPercent > 0 && (
          <span className="text-3xl leading-none font-light text-deal">
            -{variant.discountPercent}%
          </span>
        )}
        <Price priceCents={variant.priceCents} size="md" />
      </div>
      {variant.listPriceCents && (
        <p className="mt-1 text-xs text-gray-600">
          List Price: <s>{formatCents(variant.listPriceCents)}</s>
        </p>
      )}
    </div>
  )
}

export default function ProductSummary({ product, variant, onSelectVariant }) {
  const { title, brand, ratingAvg, ratingCount, optionName, variants, bullets } = product

  return (
    <div className="space-y-4">
      <div className="space-y-1 border-b border-gray-200 pb-3">
        <Link to={`/s?${toQueryString({ brand })}`} className={`${LINK_CLASS} text-sm`}>
          Visit the {brand} Store
        </Link>
        <h1 className="text-2xl leading-tight">{title}</h1>
        {ratingCount > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span>{ratingAvg.toFixed(1)}</span>
            <StarRating value={ratingAvg} />
            <a href="#reviews" className={LINK_CLASS}>
              {ratingCount.toLocaleString('en-US')} {ratingCount === 1 ? 'rating' : 'ratings'}
            </a>
          </div>
        )}
      </div>
      <PriceBlock variant={variant} />
      <VariantSelector
        optionName={optionName}
        variants={variants}
        selectedId={variant._id}
        onSelect={onSelectVariant}
      />
      <AboutThisItem bullets={bullets} />
    </div>
  )
}
