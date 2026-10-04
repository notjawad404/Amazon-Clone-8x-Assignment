const DAY_MS = 24 * 60 * 60 * 1000

export function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS)
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

export function addBusinessDays(date, businessDays) {
  let result = new Date(date)
  let remaining = businessDays
  while (remaining > 0) {
    result = addDays(result, 1)
    const weekday = result.getUTCDay()
    if (weekday !== 0 && weekday !== 6) remaining -= 1
  }
  return result
}
