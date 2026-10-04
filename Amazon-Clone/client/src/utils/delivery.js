const FORMATS = {
  short: new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }),
  long: new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }),
}

// Delivery dates are counted in UTC business days on the server, so they're shown in UTC too.
export function formatDeliveryDate(isoDate, style = 'short') {
  return FORMATS[style].format(new Date(isoDate))
}
