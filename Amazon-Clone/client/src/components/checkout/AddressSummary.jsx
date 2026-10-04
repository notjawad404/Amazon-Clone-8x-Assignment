const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

function countryName(code) {
  try {
    return regionNames.of(code)
  } catch {
    return code
  }
}

export default function AddressSummary({ address }) {
  if (!address) return <p className="text-error">Add a shipping address to continue.</p>
  const { fullName, line1, line2, city, state, zip, country } = address
  const locality = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')

  return (
    <address className="not-italic">
      <span className="font-bold">{fullName}</span>
      <br />
      {line1}
      {line2 && `, ${line2}`}
      <br />
      {locality}
      <br />
      {countryName(country)}
    </address>
  )
}
