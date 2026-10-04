import { useAuth } from '../../hooks/useAuth'
import Icon from '../ui/Icon'

export default function DeliverTo({ variant = 'stacked' }) {
  const { user, firstName, isAuthenticated } = useAuth()
  const location = user?.deliveryLocation
  const recipient = isAuthenticated ? `Deliver to ${firstName}` : 'Deliver to'
  const place = location ? `${location.city} ${location.zip}` : 'Update location'

  if (variant === 'strip') {
    return (
      <div className="flex items-center gap-1.5 bg-nav-mid px-3 py-2 text-sm text-white lg:hidden">
        <Icon name="location" className="size-4" />
        <p className="truncate">
          {recipient} <span className="font-bold">- {place}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="hidden shrink-0 items-end gap-0.5 px-2 py-1 lg:flex">
      <Icon name="location" className="mb-0.5 size-5" />
      <p className="leading-tight">
        <span className="block max-w-32 truncate text-xs text-gray-300">{recipient}</span>
        <span className="block max-w-32 truncate text-sm font-bold">{place}</span>
      </p>
    </div>
  )
}
