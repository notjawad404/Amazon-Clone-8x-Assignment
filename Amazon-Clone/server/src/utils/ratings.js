const STARS = [1, 2, 3, 4, 5]

export function statsFromBreakdown(breakdown) {
  const ratingBreakdown = Object.fromEntries(STARS.map((star) => [star, breakdown[star] ?? 0]))
  const ratingCount = STARS.reduce((sum, star) => sum + ratingBreakdown[star], 0)
  const total = STARS.reduce((sum, star) => sum + star * ratingBreakdown[star], 0)
  const ratingAvg = ratingCount ? Math.round((total / ratingCount) * 100) / 100 : 0

  return { ratingAvg, ratingCount, ratingBreakdown }
}

export function ratingStats(ratings) {
  const breakdown = {}
  for (const rating of ratings) breakdown[rating] = (breakdown[rating] ?? 0) + 1
  return statsFromBreakdown(breakdown)
}
