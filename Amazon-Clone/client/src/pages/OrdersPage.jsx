import { useId } from 'react'
import { Link } from 'react-router-dom'
import OrderCard from '../components/orders/OrderCard'
import Pagination from '../components/search/Pagination'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import { buttonClasses } from '../components/ui/buttonStyles'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import Skeleton from '../components/ui/Skeleton'
import { useGetOrdersQuery } from '../features/orders/ordersApi'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSearchParamsState } from '../hooks/useSearchParamsState'
import { DEFAULT_ORDER_RANGE, ORDER_RANGE_OPTIONS } from '../utils/constants'

const CRUMBS = [{ label: 'Your Account', to: '/account' }, { label: 'Your Orders' }]
const SKELETON_KEYS = ['o1', 'o2', 'o3']

function rangeText(range) {
  const option = ORDER_RANGE_OPTIONS.find((item) => item.value === range)
  return option ? `in the ${option.label}` : `in ${range}`
}

function RangeSelect({ range, years, onChange }) {
  const selectId = useId()
  const options = [...ORDER_RANGE_OPTIONS, ...years.map((year) => ({ value: year, label: year }))]
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={selectId}>Show orders from</label>
      <select
        id={selectId}
        value={range}
        onChange={(event) => onChange(event.target.value)}
        className="cursor-pointer rounded-lg border border-gray-300 bg-gray-100 px-2 py-1.5 shadow-sm focus:ring-3 focus:ring-focus/40 focus:outline-none"
      >
        {options.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function OrdersPage() {
  useDocumentTitle('Your Orders')
  const { searchParams, setParams } = useSearchParamsState()
  const range = searchParams.get('range') ?? DEFAULT_ORDER_RANGE
  const page = Number(searchParams.get('page')) || 1
  const { data, currentData, isError, isFetching, refetch } = useGetOrdersQuery({ range, page })
  const years = data?.years ?? []

  let content
  if (isError) {
    content = (
      <ErrorState title="We couldn’t load your orders" onRetry={refetch} isRetrying={isFetching} />
    )
  } else if (!currentData) {
    content = SKELETON_KEYS.map((key) => <Skeleton key={key} className="h-56 w-full" />)
  } else if (!currentData.items.length) {
    content = (
      <EmptyState
        title="You have no orders here"
        message={`You haven’t placed any orders ${rangeText(range)}.`}
        className="border border-gray-300"
      >
        <Link to="/" className={buttonClasses('yellow', 'mt-5 px-6')}>
          Start shopping
        </Link>
      </EmptyState>
    )
  } else {
    content = (
      <>
        {currentData.items.map((order) => (
          <OrderCard key={order.orderNumber} order={order} />
        ))}
        <Pagination page={currentData.page} pages={currentData.pages} />
      </>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumbs items={CRUMBS} className="mb-3" />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl">Your Orders</h1>
        <RangeSelect
          range={range}
          years={years}
          onChange={(value) => setParams({ range: value === DEFAULT_ORDER_RANGE ? null : value })}
        />
      </div>
      {currentData && (
        <p className="mb-3 text-sm">
          <span className="font-bold">
            {currentData.total} {currentData.total === 1 ? 'order' : 'orders'}
          </span>{' '}
          placed {rangeText(range)}
        </p>
      )}
      <div className="space-y-4">{content}</div>
    </div>
  )
}
