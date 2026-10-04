export function discountPercent(priceCents, listPriceCents) {
  if (!(listPriceCents > priceCents)) return 0
  return Math.round((1 - priceCents / listPriceCents) * 100)
}
