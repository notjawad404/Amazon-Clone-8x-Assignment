import { useSearchParamsState } from '../../hooks/useSearchParamsState'
import { formatPriceRange, hasActiveFilters } from '../../utils/search'
import Icon from '../ui/Icon'
import { FILTER_LINK } from './filterStyles'

const CLEARED = { minPrice: null, maxPrice: null, rating: null, brand: null, inStock: null }

function toChips({ minPrice, maxPrice, rating, brands, includeOutOfStock }) {
  const chips = []
  if (minPrice !== null || maxPrice !== null) {
    chips.push({
      key: 'price',
      label: formatPriceRange(minPrice, maxPrice),
      clear: { minPrice: null, maxPrice: null },
    })
  }
  if (rating !== null) {
    chips.push({ key: 'rating', label: `${rating}★ & Up`, clear: { rating: null } })
  }
  for (const brand of brands) {
    chips.push({
      key: `brand-${brand}`,
      label: brand,
      clear: { brand: brands.filter((name) => name !== brand) },
    })
  }
  if (includeOutOfStock) {
    chips.push({ key: 'stock', label: 'Include out of stock', clear: { inStock: null } })
  }
  return chips
}

export default function ActiveFilters() {
  const { filters, setParams } = useSearchParamsState()
  if (!hasActiveFilters(filters)) return null
  const chips = toChips(filters)

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <ul aria-label="Active filters" className="flex flex-wrap gap-2">
        {chips.map(({ key, label, clear }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => setParams(clear)}
              aria-label={`Remove filter: ${label}`}
              className="flex cursor-pointer items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs shadow-sm hover:bg-gray-50 focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none"
            >
              {label}
              <Icon name="close" className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {chips.length > 1 && (
        <button
          type="button"
          onClick={() => setParams(CLEARED)}
          className={`${FILTER_LINK} cursor-pointer text-xs`}
        >
          Clear all
        </button>
      )}
    </div>
  )
}
