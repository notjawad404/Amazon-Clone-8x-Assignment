const BRAND_NAMES = {
  amex: 'American Express',
  diners: 'Diners Club',
  discover: 'Discover',
  jcb: 'JCB',
  mastercard: 'Mastercard',
  unionpay: 'UnionPay',
  visa: 'Visa',
}

export function formatCard(card) {
  if (!card) return null
  const brand = BRAND_NAMES[card.brand] ?? card.brand
  return `${brand} •••• ${card.last4}`
}
