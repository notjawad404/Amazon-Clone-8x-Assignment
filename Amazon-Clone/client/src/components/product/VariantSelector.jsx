import { formatCents } from '../../utils/money'

function optionClasses(isSelected, isAvailable) {
  if (isSelected) return 'border-link bg-link/5 ring-2 ring-link/40'
  if (!isAvailable) return 'cursor-not-allowed border-dashed border-gray-300 text-gray-500'
  return 'border-gray-400 hover:bg-gray-50'
}

export default function VariantSelector({ optionName, variants, selectedId, onSelect }) {
  if (!optionName || variants.length < 2) return null
  const selected = variants.find((variant) => variant._id === selectedId)

  return (
    <fieldset>
      <legend className="mb-2 text-sm">
        {optionName}: <span className="font-bold">{selected?.label}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const isSelected = variant._id === selectedId
          const isAvailable = variant.stock > 0
          return (
            <button
              key={variant._id}
              type="button"
              aria-pressed={isSelected}
              disabled={!isAvailable && !isSelected}
              onClick={() => onSelect(variant._id)}
              className={`flex min-w-20 cursor-pointer flex-col items-start rounded-lg border px-3 py-1.5 text-left text-sm focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none ${optionClasses(isSelected, isAvailable)}`}
            >
              <span className={isAvailable ? '' : 'line-through'}>{variant.label}</span>
              {!isAvailable && <span className="sr-only">, unavailable</span>}
              <span className="text-xs">{formatCents(variant.priceCents)}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
