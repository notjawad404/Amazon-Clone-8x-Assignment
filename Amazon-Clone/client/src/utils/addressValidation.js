const US_ZIP = /^\d{5}(-\d{4})?$/
const POSTAL_CODE = /^[A-Za-z0-9][A-Za-z0-9 -]{1,11}$/

const required = (value, message) => (value.trim() ? null : message)

function zipError(zip, country) {
  const value = zip.trim()
  if (country === 'US') return US_ZIP.test(value) ? null : 'Enter a 5-digit ZIP code'
  return !value || POSTAL_CODE.test(value) ? null : 'Enter a valid postal code'
}

export function validateAddress(values, { hasStates = true } = {}) {
  const errors = {
    fullName: required(values.fullName, 'Enter a full name'),
    line1: required(values.line1, 'Enter a street address'),
    country: required(values.country, 'Choose a country'),
    state: hasStates ? required(values.state, 'Choose a state or province') : null,
    city: required(values.city, 'Enter a city'),
    zip: zipError(values.zip, values.country),
    phone: /^[0-9+()\-.\s]{7,20}$/.test(values.phone.trim()) ? null : 'Enter a valid phone number',
  }
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message))
}
