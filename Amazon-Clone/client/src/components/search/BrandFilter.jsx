import { useState } from 'react'
import { BRAND_VISIBLE_COUNT } from '../../utils/constants'
import Checkbox from '../ui/Checkbox'
import FilterSection from './FilterSection'
import { FILTER_LINK } from './filterStyles'

// Keeps selected brands listed even when the other filters leave them with no results.
function withSelected(facetBrands, selected) {
  const names = new Set(facetBrands.map((brand) => brand.name))
  const missing = selected.filter((name) => !names.has(name)).map((name) => ({ name, count: 0 }))
  return [...missing, ...facetBrands]
}

export default function BrandFilter({ facetBrands, selected, onChange }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const brands = withSelected(facetBrands, selected)
  if (!brands.length) return null

  const hasMore = brands.length > BRAND_VISIBLE_COUNT
  const visible = isExpanded
    ? brands
    : brands.filter((brand, index) => index < BRAND_VISIBLE_COUNT || selected.includes(brand.name))

  function toggle(name, isChecked) {
    onChange({
      brand: isChecked ? [...selected, name] : selected.filter((brand) => brand !== name),
    })
  }

  return (
    <FilterSection
      title="Brands"
      onClear={selected.length ? () => onChange({ brand: null }) : null}
    >
      <ul className="space-y-1">
        {visible.map(({ name, count }) => (
          <li key={name}>
            <Checkbox
              checked={selected.includes(name)}
              onChange={(event) => toggle(name, event.target.checked)}
              label={
                <span>
                  {name} <span className="text-gray-600">({count})</span>
                </span>
              }
            />
          </li>
        ))}
      </ul>
      {hasMore && (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((value) => !value)}
          className={`${FILTER_LINK} mt-1.5 cursor-pointer`}
        >
          {isExpanded ? 'See less' : 'See more'}
        </button>
      )}
    </FilterSection>
  )
}
