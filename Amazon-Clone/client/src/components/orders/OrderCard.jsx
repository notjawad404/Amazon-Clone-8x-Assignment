import { useId } from 'react'
import { Link } from 'react-router-dom'
import { imageSrcSet, imageUrl } from '../../utils/cloudinary'
import { formatCents } from '../../utils/money'
import { deliveryText, formatOrderDate, needsPayment } from '../../utils/orderStatus'
import AddressSummary from '../checkout/AddressSummary'
import { buttonClasses } from '../ui/buttonStyles'
import Icon from '../ui/Icon'
import BuyAgainButton from './BuyAgainButton'
import StatusBadge from './StatusBadge'

const IMAGE_WIDTH = 96
const LINK = 'text-link hover:text-link-hover hover:underline'

// The address appears on hover and on keyboard focus. On phones it spans the card header.
function ShipTo({ address }) {
  const popoverId = useId()
  return (
    <div className="group sm:relative">
      <button
        type="button"
        aria-describedby={popoverId}
        className={`flex cursor-default items-center gap-0.5 rounded-sm ${LINK} focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none`}
      >
        {address.fullName}
        <Icon name="chevron-down" className="size-3.5" />
      </button>
      <div
        id={popoverId}
        role="tooltip"
        className="absolute top-full right-4 left-4 z-20 mt-1 hidden rounded-md border border-gray-300 bg-white p-3 text-sm text-ink normal-case shadow-lg group-focus-within:block group-hover:block sm:right-auto sm:left-0 sm:w-60"
      >
        <AddressSummary address={address} />
      </div>
    </div>
  )
}

function HeaderField({ label, children }) {
  return (
    <div>
      <dt className="uppercase">{label}</dt>
      <dd className="text-sm text-gray-800">{children}</dd>
    </div>
  )
}

function ItemRow({ item }) {
  return (
    <li className="flex gap-4">
      <div className="flex size-24 shrink-0 items-center justify-center rounded-sm bg-gray-100 p-1">
        {item.image && (
          <img
            src={imageUrl(item.image, { w: IMAGE_WIDTH })}
            srcSet={imageSrcSet(item.image, IMAGE_WIDTH)}
            alt=""
            width={IMAGE_WIDTH}
            height={IMAGE_WIDTH}
            loading="lazy"
            className="size-full object-contain mix-blend-multiply"
          />
        )}
      </div>
      <div className="min-w-0 text-sm">
        {item.slug ? (
          <Link to={`/p/${item.slug}?v=${item.variantId}`} className={`line-clamp-2 ${LINK}`}>
            {item.title}
          </Link>
        ) : (
          <p className="line-clamp-2">{item.title}</p>
        )}
        {item.variantLabel !== 'Standard' && (
          <p className="text-xs text-gray-600">{item.variantLabel}</p>
        )}
        {item.qty > 1 && <p className="text-xs text-gray-600">Qty: {item.qty}</p>}
      </div>
    </li>
  )
}

export default function OrderCard({ order }) {
  const detailsPath = `/orders/${order.orderNumber}`

  return (
    <article
      aria-label={`Order ${order.orderNumber}`}
      className="rounded-lg border border-gray-300 bg-white"
    >
      <header className="relative rounded-t-lg border-b border-gray-300 bg-gray-100 px-4 py-3 text-xs text-gray-600">
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <HeaderField label="Order placed">{formatOrderDate(order.placedAt)}</HeaderField>
          <HeaderField label="Total">{formatCents(order.totalCents)}</HeaderField>
          <HeaderField label="Ship to">
            <ShipTo address={order.shippingAddress} />
          </HeaderField>
          <div className="sm:ml-auto sm:text-right">
            <dt className="uppercase">Order # {order.orderNumber}</dt>
            <dd className="text-sm">
              <Link to={detailsPath} className={LINK}>
                View order details
              </Link>
            </dd>
          </div>
        </dl>
      </header>
      <div className="flex flex-col gap-4 p-4 md:flex-row">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{deliveryText(order)}</h2>
            <StatusBadge order={order} />
          </div>
          <ul className="space-y-3">
            {order.items.map((item) => (
              <ItemRow key={item.variantId} item={item} />
            ))}
          </ul>
        </div>
        <div className="flex shrink-0 flex-col gap-2 md:w-52">
          {needsPayment(order) && (
            <Link
              to={`/order/${order.orderNumber}/confirmation`}
              className={buttonClasses('orange', 'w-full')}
            >
              Complete payment
            </Link>
          )}
          <BuyAgainButton orderNumber={order.orderNumber} />
          <Link to={detailsPath} className={buttonClasses('outline', 'w-full')}>
            View order details
          </Link>
        </div>
      </div>
    </article>
  )
}
