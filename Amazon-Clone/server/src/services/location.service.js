import { City, Country } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'

const US_ZIP = /^\d{5}(-\d{4})?$/

function fieldError(path, message) {
  return new ApiError(400, 'Please check the highlighted fields.', { details: [{ path, message }] })
}

const sameText = (a, b) => a?.toLowerCase() === b.toLowerCase()

export function listCountries() {
  return Country.aggregate([
    { $sort: { name: 1 } },
    {
      $project: { _id: 0, code: 1, name: 1, hasStates: { $gt: [{ $size: '$states' }, 0] } },
    },
  ])
}

export async function listStates(countryCode) {
  const country = await Country.findOne({ code: countryCode }).select('states').lean()
  if (!country) throw new ApiError(404, 'Country not found', { code: 'country_not_found' })
  return country.states.map(({ code, name }) => ({ code, name }))
}

export async function listCities(country, state) {
  const cities = await City.find({ country, state }).select('name -_id').sort({ name: 1 }).lean()
  return cities.map((city) => city.name)
}

/**
 * Checks the country exists and, when it has states, that the state is one of them (by name or
 * code). Returns the canonical state name. Cities are not checked: the list misses small towns.
 */
export async function normalizeRegion({ country, state = '', zip = '' }) {
  const found = await Country.findOne({ code: country }).select('states').lean()
  if (!found) throw fieldError('country', 'Choose a country from the list')

  let stateName = state.trim()
  if (found.states.length) {
    const match = found.states.find(
      (candidate) => sameText(candidate.name, stateName) || sameText(candidate.code, stateName),
    )
    if (!match) {
      throw fieldError('state', stateName ? 'Choose a state from the list' : 'Choose a state')
    }
    stateName = match.name
  }
  if (country === 'US' && !US_ZIP.test(zip)) throw fieldError('zip', 'Enter a 5-digit ZIP code')
  return { state: stateName }
}
