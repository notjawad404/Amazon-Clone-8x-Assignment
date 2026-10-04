import { Link } from 'react-router-dom'
import { imageSrcSet, imageUrl } from '../../utils/cloudinary'
import { formatCents } from '../../utils/money'
import Icon from '../ui/Icon'

const THUMB_SIZE = 40

function TermLabel({ term, typed }) {
  const prefix = typed.toLowerCase()
  if (!term.startsWith(prefix)) return <span className="font-bold">{term}</span>
  return (
    <span>
      {term.slice(0, prefix.length)}
      <span className="font-bold">{term.slice(prefix.length)}</span>
    </span>
  )
}

function OptionContent({ option, typed }) {
  if (option.type === 'term') {
    return (
      <>
        <Icon name="search" className="size-4 text-gray-500" />
        <TermLabel term={option.term} typed={typed} />
      </>
    )
  }

  if (option.type === 'category') {
    const { name, department } = option.category
    return (
      <span>
        <span className="font-bold">{name}</span>
        <span className="text-gray-600"> {department ? `in ${department}` : 'department'}</span>
      </span>
    )
  }

  const { title, image, priceCents } = option.product
  return (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-gray-100">
        {image && (
          <img
            src={imageUrl(image.url, { w: THUMB_SIZE })}
            srcSet={imageSrcSet(image.url, THUMB_SIZE)}
            alt=""
            width={THUMB_SIZE}
            height={THUMB_SIZE}
            className="max-h-full object-contain mix-blend-multiply"
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{title}</span>
        <span className="text-xs text-price">{formatCents(priceCents)}</span>
      </span>
    </>
  )
}

const GROUP_LABELS = { category: 'Departments', product: 'Products' }

export default function SearchSuggestions({ id, options, activeIndex, typed, pathFor, onPick }) {
  return (
    <ul
      id={id}
      role="listbox"
      aria-label="Search suggestions"
      className="absolute inset-x-0 top-full z-40 mt-1 max-h-[70vh] overflow-y-auto rounded-md bg-white py-1 text-sm text-ink shadow-lg ring-1 ring-black/10"
    >
      {options.map((option, index) => {
        const startsGroup = GROUP_LABELS[option.type] && options[index - 1]?.type !== option.type
        return (
          <li
            key={option.id}
            id={`${id}-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            className={`${startsGroup ? 'mt-1 border-t border-gray-200 pt-1' : ''}`}
          >
            {startsGroup && (
              <span
                aria-hidden="true"
                className="block px-3 pt-1 pb-0.5 text-xs font-bold text-gray-500 uppercase"
              >
                {GROUP_LABELS[option.type]}
              </span>
            )}
            <Link
              to={pathFor(option)}
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onPick(option)}
              className={`flex items-center gap-3 px-3 py-1.5 ${index === activeIndex ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
            >
              <OptionContent option={option} typed={typed} />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
