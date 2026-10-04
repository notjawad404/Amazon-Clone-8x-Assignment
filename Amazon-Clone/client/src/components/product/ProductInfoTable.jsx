const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

function dimensionsText(dimensions) {
  const { width, height, depth } = dimensions ?? {}
  if (![width, height, depth].every(Number.isFinite)) return null
  return `${[width, height, depth].map((value) => number.format(value)).join(' x ')} inches`
}

export default function ProductInfoTable({ brand, specs }) {
  const rows = [
    ['Brand', brand],
    ['Product dimensions', dimensionsText(specs.dimensions)],
    [
      'Item weight',
      Number.isFinite(specs.weightOz) ? `${number.format(specs.weightOz)} ounces` : null,
    ],
    ['Warranty', specs.warranty],
    ['Return policy', specs.returnPolicy],
    ['Shipping', specs.shippingNote],
  ].filter(([, value]) => value)

  return (
    <section aria-labelledby="product-info-heading">
      <h2 id="product-info-heading" className="mb-3 text-xl font-bold">
        Product information
      </h2>
      <table className="w-full max-w-2xl border-t border-gray-200 text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-gray-200">
              <th scope="row" className="w-2/5 bg-gray-100 px-3 py-2 text-left font-bold">
                {label}
              </th>
              <td className="px-3 py-2">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
