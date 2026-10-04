export const APP_NAME = 'ShopNest'

export const CATALOG_CACHE_SECONDS = 600
export const HERO_AUTOPLAY_MS = 6000
export const CATEGORY_CARD_COUNT = 4
export const CATEGORY_CARD_TILES = 4
export const GUEST_CART_STORAGE_KEY = 'guestCart'
export const MAX_CART_BADGE_COUNT = 99
export const SEARCH_DEBOUNCE_MS = 300
export const SEARCH_QUERY_MAX_LENGTH = 100
export const SEARCH_PAGE_SIZE = 24
export const SEARCH_MAX_BRANDS = 20
export const SEARCH_MAX_PRICE_DOLLARS = 100000
export const DEFAULT_SORT = 'relevance'
export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Featured' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Avg. Customer Review' },
  { value: 'newest', label: 'Newest Arrivals' },
]
export const PRICE_RANGES = [
  { min: null, max: 25 },
  { min: 25, max: 50 },
  { min: 50, max: 100 },
  { min: 100, max: 200 },
  { min: 200, max: null },
]
export const RATING_FILTERS = [4, 3, 2, 1]
export const BRAND_VISIBLE_COUNT = 8
export const LOW_STOCK_THRESHOLD = 5
export const MAX_CART_QTY = 30
export const MAX_CART_ITEMS = 50
export const SELLER_NAME = APP_NAME
