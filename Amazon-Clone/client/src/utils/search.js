export function searchPath(query, category = '') {
  const params = new URLSearchParams({ k: query })
  if (category) params.set('category', category)
  return `/s?${params}`
}
