import { useSearchParamsState } from '../../hooks/useSearchParamsState'
import Checkbox from '../ui/Checkbox'
import BrandFilter from './BrandFilter'
import CategoryTree from './CategoryTree'
import FilterSection from './FilterSection'
import PriceFilter from './PriceFilter'
import RatingFilter from './RatingFilter'

export default function FilterSidebar({ categorySlug, isCategoryRoute, facetBrands = [] }) {
  const { filters, setParams } = useSearchParamsState()
  const { minPrice, maxPrice, rating, brands, includeOutOfStock, query } = filters

  return (
    <div>
      <CategoryTree categorySlug={categorySlug} query={query} isCategoryRoute={isCategoryRoute} />
      <PriceFilter
        key={`${minPrice}-${maxPrice}`}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onChange={setParams}
      />
      <RatingFilter rating={rating} onChange={setParams} />
      <BrandFilter facetBrands={facetBrands} selected={brands} onChange={setParams} />
      <FilterSection
        title="Availability"
        onClear={includeOutOfStock ? () => setParams({ inStock: null }) : null}
      >
        <Checkbox
          label="Include out of stock"
          checked={includeOutOfStock}
          onChange={(event) => setParams({ inStock: event.target.checked ? 'false' : null })}
        />
      </FilterSection>
    </div>
  )
}
