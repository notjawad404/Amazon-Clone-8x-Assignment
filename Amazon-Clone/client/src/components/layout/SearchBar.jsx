import { useId, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useGetSuggestionsQuery } from '../../features/catalog/catalogApi'
import { useDebounce } from '../../hooks/useDebounce'
import { APP_NAME, SEARCH_DEBOUNCE_MS, SEARCH_QUERY_MAX_LENGTH } from '../../utils/constants'
import { searchPath } from '../../utils/search'
import Icon from '../ui/Icon'
import DepartmentSelect from './DepartmentSelect'
import SearchSuggestions from './SearchSuggestions'

function toOptions(suggestions) {
  if (!suggestions) return []
  const { terms, categories, products } = suggestions
  return [
    ...terms.map((term) => ({ id: `term-${term}`, type: 'term', term })),
    ...categories.map((category) => ({
      id: `category-${category._id}`,
      type: 'category',
      category,
    })),
    ...products.map((product) => ({ id: `product-${product._id}`, type: 'product', product })),
  ]
}

function optionPath(option, category) {
  if (option.type === 'term') return searchPath(option.term, category)
  if (option.type === 'category') return `/c/${option.category.slug}`
  return `/p/${option.product.slug}`
}

export default function SearchBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const listboxId = useId()
  const inputRef = useRef(null)

  const [text, setText] = useState('')
  const [category, setCategory] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [syncedSearch, setSyncedSearch] = useState(null)

  const urlSearch = location.pathname === '/s' ? location.search : null
  if (urlSearch !== syncedSearch) {
    setSyncedSearch(urlSearch)
    if (urlSearch !== null) {
      setText(searchParams.get('k') ?? '')
      setCategory(searchParams.get('category') ?? '')
    }
  }

  const typed = text.trim()
  const debouncedQuery = useDebounce(typed, SEARCH_DEBOUNCE_MS)
  const { data: suggestions } = useGetSuggestionsQuery(
    { q: debouncedQuery, category: category || undefined },
    { skip: !debouncedQuery },
  )
  const options = typed ? toOptions(suggestions) : []
  const isExpanded = isOpen && options.length > 0

  function close() {
    setIsOpen(false)
    setActiveIndex(-1)
  }

  function finishSearch() {
    close()
    inputRef.current.blur()
  }

  function handlePick(option) {
    if (option.type === 'term') setText(option.term)
    finishSearch()
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!typed) {
      inputRef.current.focus()
      return
    }
    finishSearch()
    navigate(searchPath(typed, category))
  }

  function moveActive(step) {
    setIsOpen(true)
    const count = options.length + 1
    setActiveIndex((current) => ((current + 1 + step + count) % count) - 1)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!options.length) return
      event.preventDefault()
      moveActive(event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Enter' && isExpanded && options[activeIndex]) {
      event.preventDefault()
      handlePick(options[activeIndex])
      navigate(optionPath(options[activeIndex], category))
    } else if (event.key === 'Escape' && isExpanded) {
      event.preventDefault()
      close()
    }
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="relative order-last w-full pb-2 md:order-none md:w-auto md:min-w-0 md:flex-1 md:pb-0"
    >
      <div className="flex h-10 rounded-md bg-white text-ink focus-within:ring-3 focus-within:ring-btn-orange">
        <DepartmentSelect value={category} onChange={setCategory} />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label={`Search ${APP_NAME}`}
          aria-autocomplete="list"
          aria-expanded={isExpanded}
          aria-controls={listboxId}
          aria-activedescendant={
            isExpanded && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined
          }
          placeholder={`Search ${APP_NAME}`}
          autoComplete="off"
          enterKeyHint="search"
          maxLength={SEARCH_QUERY_MAX_LENGTH}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setIsOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={close}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 rounded-l-md bg-transparent px-3 text-base outline-none md:rounded-none [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="submit"
          aria-label="Search"
          className="flex w-11 shrink-0 cursor-pointer items-center justify-center rounded-r-md bg-accent hover:bg-btn-orange focus-visible:ring-3 focus-visible:ring-ink focus-visible:outline-none focus-visible:ring-inset"
        >
          <Icon name="search" className="size-5" strokeWidth={2.5} />
        </button>
      </div>
      {isExpanded && (
        <SearchSuggestions
          id={listboxId}
          options={options}
          activeIndex={activeIndex}
          typed={typed}
          pathFor={(option) => optionPath(option, category)}
          onPick={handlePick}
        />
      )}
    </form>
  )
}
