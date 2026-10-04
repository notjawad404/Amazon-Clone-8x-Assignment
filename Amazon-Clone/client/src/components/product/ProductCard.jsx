import { Link } from 'react-router-dom'
import { imageSrcSet, imageUrl } from '../../utils/cloudinary'
import Price from '../ui/Price'
import StarRating from '../ui/StarRating'

const IMAGE_WIDTH = 240

export default function ProductCard({ product }) {
  const { slug, title, image, priceCents, listPriceCents, discountPercent, inStock } = product

  return (
    <article className="flex h-full flex-col rounded-sm border border-gray-200 bg-white">
      <Link
        to={`/p/${slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="flex aspect-square items-center justify-center bg-gray-100 p-4"
      >
        {image && (
          <img
            src={imageUrl(image.url, { w: IMAGE_WIDTH })}
            srcSet={imageSrcSet(image.url, IMAGE_WIDTH)}
            alt=""
            width={IMAGE_WIDTH}
            height={IMAGE_WIDTH}
            loading="lazy"
            className="size-full object-contain mix-blend-multiply"
          />
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h2 className="text-base leading-snug">
          <Link
            to={`/p/${slug}`}
            className="line-clamp-2 rounded-sm hover:text-link-hover focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none"
          >
            {title}
          </Link>
        </h2>
        <StarRating value={product.ratingAvg} count={product.ratingCount} />
        {discountPercent > 0 && (
          <span className="w-fit rounded-sm bg-deal px-1.5 py-0.5 text-xs font-bold text-white">
            {discountPercent}% off
          </span>
        )}
        <Price priceCents={priceCents} listPriceCents={listPriceCents} />
        {!inStock && <p className="text-sm text-error">Currently unavailable</p>}
      </div>
    </article>
  )
}
