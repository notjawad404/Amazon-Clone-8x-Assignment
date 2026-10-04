import { useSearchParams } from 'react-router-dom'
import { readFilters } from '../utils/search'

/**
 * Listing filters, sort, and page live in the URL, so back/forward and reloads keep them.
 * `setParams({ key: value })` replaces those keys (null clears one) and resets to page 1
 * unless `page` is among them.
 */
export function useSearchParamsState() {
  const [searchParams, setSearchParams] = useSearchParams()

  function setParams(changes) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(changes)) {
        next.delete(key)
        for (const item of [value].flat()) {
          if (item !== undefined && item !== null && item !== '') next.append(key, item)
        }
      }
      if (!('page' in changes)) next.delete('page')
      return next
    })
  }

  return { filters: readFilters(searchParams), searchParams, setParams }
}
