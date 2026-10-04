const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const wholeDollars = new Intl.NumberFormat('en-US')

export function formatCents(cents) {
  return usd.format(cents / 100)
}

export function splitCents(cents) {
  return {
    dollars: wholeDollars.format(Math.floor(cents / 100)),
    cents: String(cents % 100).padStart(2, '0'),
  }
}
