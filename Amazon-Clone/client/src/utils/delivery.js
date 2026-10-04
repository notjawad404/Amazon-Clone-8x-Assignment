const shortDate = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

// Delivery dates are counted in UTC business days on the server, so they're shown in UTC too.
export function formatDeliveryDate(isoDate) {
  return shortDate.format(new Date(isoDate))
}
