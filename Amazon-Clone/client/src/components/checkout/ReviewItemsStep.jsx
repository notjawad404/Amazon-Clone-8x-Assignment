import { Link } from 'react-router-dom'
import { imageSrcSet, imageUrl } from '../../utils/cloudinary'
import { formatCents } from '../../utils/money'

const IMAGE_WIDTH = 96

export default function ReviewItemsStep({ checkout }) {
  const issuesByVariant = new Map(checkout.issues.map((issue) => [issue.variantId, issue]))

  return (
    <div className="space-y-3">
      {checkout.source === 'cart' && (
        <p className="text-sm">
          Want to change something?{' '}
          <Link to="/cart" className="text-link hover:text-link-hover hover:underline">
            Change items in your cart
          </Link>
        </p>
      )}
      <ul className="divide-y divide-gray-200 rounded-md border border-gray-300">
        {checkout.items.map((item) => {
          const issue = issuesByVariant.get(item.variantId)
          return (
            <li key={item.variantId} className="flex gap-3 p-3">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-sm bg-gray-100 p-1">
                {item.image && (
                  <img
                    src={imageUrl(item.image.url, { w: IMAGE_WIDTH })}
                    srcSet={imageSrcSet(item.image.url, IMAGE_WIDTH)}
                    alt=""
                    width={IMAGE_WIDTH}
                    height={IMAGE_WIDTH}
                    className="size-full object-contain mix-blend-multiply"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="line-clamp-2 font-bold">{item.title}</p>
                {item.optionName && (
                  <p className="text-xs">
                    {item.optionName}: {item.variantLabel}
                  </p>
                )}
                {item.available && (
                  <p className="mt-1">
                    <span className="font-bold text-price">{formatCents(item.lineTotalCents)}</span>
                    <span className="text-xs text-gray-600">
                      {' '}
                      · {item.qty} × {formatCents(item.unitPriceCents)}
                    </span>
                  </p>
                )}
                {issue && <p className="mt-1 text-sm font-bold text-error">{issue.message}</p>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
