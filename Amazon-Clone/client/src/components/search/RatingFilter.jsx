import { RATING_FILTERS } from '../../utils/constants'
import StarRating from '../ui/StarRating'
import FilterSection from './FilterSection'
import { FILTER_OPTION } from './filterStyles'

export default function RatingFilter({ rating, onChange }) {
  return (
    <FilterSection
      title="Customer Reviews"
      onClear={rating !== null ? () => onChange({ rating: null }) : null}
    >
      <ul className="space-y-1">
        {RATING_FILTERS.map((stars) => {
          const isSelected = stars === rating
          return (
            <li key={stars}>
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={`${stars} stars & up`}
                onClick={() => onChange({ rating: stars })}
                className={`${FILTER_OPTION} flex items-center gap-1 ${isSelected ? 'font-bold' : ''}`}
              >
                <StarRating value={stars} />
                <span aria-hidden="true">&amp; Up</span>
              </button>
            </li>
          )
        })}
      </ul>
    </FilterSection>
  )
}
