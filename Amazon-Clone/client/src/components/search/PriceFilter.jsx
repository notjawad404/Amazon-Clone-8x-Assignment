import { useState } from 'react'
import { PRICE_RANGES, SEARCH_MAX_PRICE_DOLLARS } from '../../utils/constants'
import { formatPriceRange } from '../../utils/search'
import Button from '../ui/Button'
import FilterSection from './FilterSection'
import { FILTER_OPTION } from './filterStyles'

const PRICE_INPUT_CLASS =
  'h-8 w-20 rounded-md border border-gray-500 px-2 text-sm shadow-inner focus:border-focus focus:ring-3 focus:ring-focus/30 focus:outline-none'

function parseDollars(value) {
  if (!value.trim()) return null
  const dollars = Number(value)
  return Number.isFinite(dollars) && dollars >= 0 && dollars <= SEARCH_MAX_PRICE_DOLLARS
    ? dollars
    : undefined
}

function PriceInput({ label, placeholder, value, onChange }) {
  return (
    <label className="flex items-center gap-1 text-sm">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">$</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        max={SEARCH_MAX_PRICE_DOLLARS}
        step="any"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={PRICE_INPUT_CLASS}
      />
    </label>
  )
}

export default function PriceFilter({ minPrice, maxPrice, onChange }) {
  const [minInput, setMinInput] = useState(minPrice === null ? '' : String(minPrice))
  const [maxInput, setMaxInput] = useState(maxPrice === null ? '' : String(maxPrice))
  const [error, setError] = useState('')
  const isActive = minPrice !== null || maxPrice !== null

  function handleSubmit(event) {
    event.preventDefault()
    const min = parseDollars(minInput)
    const max = parseDollars(maxInput)
    if (min === undefined || max === undefined) {
      setError('Enter a valid price.')
      return
    }
    if (min !== null && max !== null && min > max) {
      setError('Min price must be less than max price.')
      return
    }
    setError('')
    onChange({ minPrice: min, maxPrice: max })
  }

  return (
    <FilterSection
      title="Price"
      onClear={isActive ? () => onChange({ minPrice: null, maxPrice: null }) : null}
    >
      <ul className="space-y-1">
        {PRICE_RANGES.map(({ min, max }) => {
          const isSelected = min === minPrice && max === maxPrice
          return (
            <li key={`${min}-${max}`}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onChange({ minPrice: min, maxPrice: max })}
                className={`${FILTER_OPTION} ${isSelected ? 'font-bold' : ''}`}
              >
                {formatPriceRange(min, max)}
              </button>
            </li>
          )
        })}
      </ul>
      <form onSubmit={handleSubmit} noValidate className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriceInput
          label="Minimum price"
          placeholder="Min"
          value={minInput}
          onChange={setMinInput}
        />
        <PriceInput
          label="Maximum price"
          placeholder="Max"
          value={maxInput}
          onChange={setMaxInput}
        />
        <Button type="submit" variant="outline">
          Go
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-1 text-xs text-error">
          {error}
        </p>
      )}
    </FilterSection>
  )
}
