import { useId } from 'react'
import { SORT_OPTIONS } from '../../utils/constants'

export default function SortSelect({ sort, onChange }) {
  const selectId = useId()

  return (
    <div className="flex items-center rounded-lg border border-gray-300 bg-gray-100 text-xs shadow-sm focus-within:ring-3 focus-within:ring-focus/40">
      <label htmlFor={selectId} className="py-1.5 pl-2.5 whitespace-nowrap">
        Sort by:
      </label>
      <select
        id={selectId}
        value={sort}
        onChange={(event) => onChange(event.target.value)}
        className="cursor-pointer bg-transparent py-1.5 pr-2 pl-1 focus:outline-none"
      >
        {SORT_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}
