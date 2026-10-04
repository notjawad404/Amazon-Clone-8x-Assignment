import { Link } from 'react-router-dom'
import { imageSrcSet, imageUrl } from '../../utils/cloudinary'
import { LOW_STOCK_THRESHOLD } from '../../utils/constants'
import { formatCents } from '../../utils/money'

const IMAGE_WIDTH = 180

function StockLine({ line }) {
  if (line.unavailable)
    return <p className="text-sm text-error">This item is no longer available.</p>
  if (line.outOfStock) return <p className="text-sm text-error">Currently out of stock.</p>
  if (line.stock <= LOW_STOCK_THRESHOLD) {
    return <p className="text-sm text-price">Only {line.stock} left in stock - order soon.</p>
  }
  return <p className="text-xs text-success">In Stock</p>
}

function ProductLink({ line, className, children, ...props }) {
  if (!line.slug) return <span className={className}>{children}</span>
  return (
    <Link to={`/p/${line.slug}?v=${line.variantId}`} className={className} {...props}>
      {children}
    </Link>
  )
}

export default function CartLineDetails({ line, price = null, children }) {
  return (
    <div className="flex gap-4">
      <ProductLink
        line={line}
        tabIndex={-1}
        aria-hidden="true"
        className="flex aspect-square w-24 shrink-0 items-center justify-center rounded-sm bg-gray-100 p-2 sm:w-36"
      >
        {line.image && (
          <img
            src={imageUrl(line.image.url, { w: IMAGE_WIDTH })}
            srcSet={imageSrcSet(line.image.url, IMAGE_WIDTH)}
            alt=""
            width={IMAGE_WIDTH}
            height={IMAGE_WIDTH}
            loading="lazy"
            className="size-full object-contain mix-blend-multiply"
          />
        )}
      </ProductLink>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-base leading-snug sm:text-lg">
            <ProductLink
              line={line}
              className="line-clamp-2 rounded-sm hover:text-link-hover hover:underline focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none"
            >
              {line.title}
            </ProductLink>
          </h3>
          {price}
        </div>
        <StockLine line={line} />
        {line.optionName && (
          <p className="text-xs">
            <span className="font-bold">{line.optionName}:</span> {line.variantLabel}
          </p>
        )}
        {line.priceChanged && (
          <p className="w-fit rounded-sm bg-btn-yellow/30 px-2 py-1 text-xs">
            Price changed from {formatCents(line.addedPriceCents)} to{' '}
            <span className="font-bold">{formatCents(line.priceCents)}</span>
          </p>
        )}
        {children}
      </div>
    </div>
  )
}
