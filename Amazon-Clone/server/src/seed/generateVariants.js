const OUT_OF_STOCK_RATE = 0.1

const sizes = (labels) => labels.map((label) => ({ label, extraCents: 0 }))

const APPAREL = { optionName: 'Size', options: sizes(['S', 'M', 'L', 'XL']) }
const STORAGE = {
  optionName: 'Storage',
  options: [
    { label: '128 GB', extraCents: 0 },
    { label: '256 GB', extraCents: 10_000 },
    { label: '512 GB', extraCents: 20_000 },
  ],
}

const RULES = {
  'mens-shirts': APPAREL,
  tops: APPAREL,
  'womens-dresses': APPAREL,
  'mens-shoes': { optionName: 'Size', options: sizes(['US 8', 'US 9', 'US 10', 'US 11', 'US 12']) },
  'womens-shoes': { optionName: 'Size', options: sizes(['US 5', 'US 6', 'US 7', 'US 8', 'US 9']) },
  smartphones: STORAGE,
  tablets: STORAGE,
  laptops: {
    optionName: 'Configuration',
    options: [
      { label: '16 GB / 512 GB', extraCents: 0 },
      { label: '32 GB / 1 TB', extraCents: 30_000 },
    ],
  },
}

const STANDARD = {
  optionName: null,
  options: [{ label: 'Standard', extraCents: 0, suffix: 'STD' }],
}

export function variantRuleFor(sourceCategory) {
  return RULES[sourceCategory] ?? STANDARD
}

export function splitStock(total, parts, faker) {
  if (parts === 1) return [total]
  const weights = Array.from({ length: parts }, () => faker.number.float({ min: 0.2, max: 1 }))
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  const shares = weights.map((weight) => Math.floor((total * weight) / weightSum))
  let remainder = total - shares.reduce((sum, share) => sum + share, 0)
  for (let i = 0; remainder > 0; i = (i + 1) % parts, remainder -= 1) shares[i] += 1
  return shares
}

function skuSuffix(option) {
  return option.suffix ?? option.label.toUpperCase().replace(/[^A-Z0-9]+/g, '')
}

export function generateVariants(sourceCategory, base, faker) {
  const { optionName, options } = variantRuleFor(sourceCategory)
  const stocks = splitStock(base.stock, options.length, faker)

  const variants = options.map((option, i) => ({
    sku: `${base.sku}-${skuSuffix(option)}`,
    label: option.label,
    priceCents: base.priceCents + option.extraCents,
    listPriceCents: base.listPriceCents === null ? null : base.listPriceCents + option.extraCents,
    stock: faker.number.float() < OUT_OF_STOCK_RATE ? 0 : stocks[i],
    isDefault: false,
    isActive: true,
  }))

  const defaultVariant = variants.find((variant) => variant.stock > 0) ?? variants[0]
  defaultVariant.isDefault = true

  return { optionName, variants }
}
