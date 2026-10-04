import { randomInt } from 'node:crypto'

function digits(count) {
  return Array.from({ length: count }, () => randomInt(10)).join('')
}

export function generateOrderNumber() {
  return `112-${digits(7)}-${digits(7)}`
}
