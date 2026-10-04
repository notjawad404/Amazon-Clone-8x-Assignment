import { Link } from 'react-router-dom'
import Price from '../ui/Price'
import StarRating from '../ui/StarRating'
import { imageSrcSet, imageUrl } from '../../utils/cloudinary'

const IMAGE_WIDTH = 200

function DealBadge({ discountPercent }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold">
      <span className="rounded-sm bg-deal px-1.5 py-1 text-white">{discountPercent}% off</span>
      <span className="text-deal">Limited time deal</span>
    </div>
  )
}

export default function ProductCardCompact({ product, isDeal = false }) {
  const { slug, title, image, priceCents, listPriceCents, discountPercent } = product

  return (
    <Link
      to={`/p/${slug}`}
      className="group flex h-full flex-col gap-1.5 rounded-sm focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none"
    >
      <div className="flex aspect-square items-center justify-center rounded-sm bg-gray-100 p-3">
        {image && (
          <img
            src={imageUrl(image.url, { w: IMAGE_WIDTH })}
            srcSet={imageSrcSet(image.url, IMAGE_WIDTH)}
            alt={image.alt || title}
            width={IMAGE_WIDTH}
            height={IMAGE_WIDTH}
            loading="lazy"
            className="size-full object-contain mix-blend-multiply"
          />
        )}
      </div>
      <h3 className={isDeal ? 'sr-only' : 'line-clamp-2 text-sm group-hover:text-link-hover'}>
        {title}
      </h3>
      {isDeal && discountPercent > 0 && <DealBadge discountPercent={discountPercent} />}
      {!isDeal && <StarRating value={product.ratingAvg} count={product.ratingCount} />}
      <Price priceCents={priceCents} listPriceCents={listPriceCents} />
    </Link>
  )
}
