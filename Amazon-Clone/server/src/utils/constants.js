export const ROLES = ['user', 'admin']

export const MAX_ADDRESSES = 10
export const MAX_CART_ITEMS = 50
export const MAX_CART_QTY = 30
export const MAX_VARIANTS = 20
export const MAX_IMAGES = 10
export const MAX_BULLETS = 10
export const MAX_TAGS = 20

export const DEFAULT_BRAND = 'Generic'
export const PRODUCT_STATUSES = ['draft', 'active', 'archived']
export const SOURCE_PROVIDERS = ['dummyjson', 'manual']

export const HOME_ROW_LIMIT = 12
export const DEAL_MIN_DISCOUNT_PERCENT = 10
export const CATALOG_CACHE_CONTROL = 'public, max-age=300'

export const SEARCH_PAGE_SIZE = 24
export const SEARCH_MAX_PAGE_SIZE = 48
export const SEARCH_QUERY_MAX_LENGTH = 100
export const SUGGESTION_SCAN_LIMIT = 20
export const SUGGESTION_PRODUCT_LIMIT = 5
export const SUGGESTION_TERM_LIMIT = 6
export const SUGGESTION_TERM_MAX_WORDS = 3
export const SUGGESTION_CATEGORY_LIMIT = 4
export const SUGGESTIONS_CACHE_CONTROL = 'public, max-age=60'

export const DELIVERY_METHODS = {
  standard: { label: 'Standard', priceCents: 599, businessDays: 5 },
  expedited: { label: 'Expedited', priceCents: 999, businessDays: 2 },
  nextday: { label: 'Next Day', priceCents: 1499, businessDays: 1 },
}
export const FREE_SHIPPING_THRESHOLD_CENTS = 3500
export const TAX_RATE = 0.08
export const CURRENCY = 'usd'

export const CHECKOUT_SOURCES = ['cart', 'buy_now']
export const CHECKOUT_STATUSES = ['open', 'completed']
export const CHECKOUT_TTL_HOURS = 24
export const CHECKOUT_ISSUE_CODES = ['out_of_stock', 'price_changed', 'unavailable']

export const ORDER_STATUSES = ['pending_payment', 'paid', 'shipped', 'delivered', 'cancelled']
export const ORDER_TRANSITIONS = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}
export const ORDER_PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded', 'partially_refunded']
export const CANCEL_REASONS = ['user_cancelled', 'reservation_expired', 'admin_cancelled']
export const RESERVATION_MINUTES = 30

export const PAYMENT_STATUSES = [
  'requires_payment_method',
  'requires_action',
  'processing',
  'succeeded',
  'canceled',
]
export const STRIPE_EVENT_STATUSES = ['received', 'processed', 'ignored', 'failed']
export const STRIPE_EVENT_TTL_DAYS = 90

export const BCRYPT_COST = 12
