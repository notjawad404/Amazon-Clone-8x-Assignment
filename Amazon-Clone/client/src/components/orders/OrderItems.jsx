import { Link } from 'react-router-dom'
import { imageSrcSet, imageUrl } from '../../utils/cloudinary'
import { formatCents } from '../../utils/money'

const IMAGE_WIDTH = 80

function ItemImage({ item }) {
  return (
    <div className="flex size-20 shrink-0 items-center justify-center rounded-sm bg-gray-100 p-1">
      {item.image && (
        <img
          src={imageUrl(item.image, { w: IMAGE_WIDTH })}
          srcSet={imageSrcSet(item.image, IMAGE_WIDTH)}
          alt=""
          width={IMAGE_WIDTH}
          height={IMAGE_WIDTH}
          className="size-full object-contain mix-blend-multiply"
        />
      )}
    </div>
  )
}

export default function OrderItems({ items }) {
  return (
    <ul className="divide-y divide-gray-200">
      {items.map((item) => (
        <li key={item.variantId} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <ItemImage item={item} />
          <div className="min-w-0 flex-1 text-sm">
            {item.slug ? (
              <Link
                to={`/p/${item.slug}?v=${item.variantId}`}
                className="line-clamp-2 text-link hover:text-link-hover hover:underline"
              >
                {item.title}
              </Link>
            ) : (
              <p className="line-clamp-2">{item.title}</p>
            )}
            {item.variantLabel !== 'Standard' && (
              <p className="text-xs text-gray-600">{item.variantLabel}</p>
            )}
            <p className="mt-1">
              <span className="font-bold">{formatCents(item.lineTotalCents)}</span>
              <span className="text-xs text-gray-600">
                {' '}
                · {item.qty} × {formatCents(item.unitPriceCents)}
              </span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
