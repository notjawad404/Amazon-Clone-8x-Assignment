import { writeFile } from 'node:fs/promises'
import { logger } from '../utils/logger.js'

// dr5hn/countries-states-cities-database, ODbL-1.0. Only names and codes are kept.
const SOURCE_URL =
  'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries%2Bstates%2Bcities.json'
const OUTPUT = new URL('./data/locations.json', import.meta.url)

const byName = (a, b) => a.name.localeCompare(b.name, 'en')

function compact(countries) {
  return countries
    .map((country) => ({
      code: country.iso2,
      name: country.name,
      states: (country.states ?? [])
        .map((state) => ({
          code: state.iso2 ?? state.state_code ?? null,
          name: state.name,
          cities: [...new Set((state.cities ?? []).map((city) => city.name))].sort((a, b) =>
            a.localeCompare(b, 'en'),
          ),
        }))
        .sort(byName),
    }))
    .filter((country) => /^[A-Z]{2}$/.test(country.code ?? ''))
    .sort(byName)
}

const res = await fetch(SOURCE_URL)
if (!res.ok) throw new Error(`Location download failed with ${res.status}`)
const countries = compact(await res.json())
await writeFile(OUTPUT, `${JSON.stringify(countries)}\n`)

const states = countries.reduce((sum, country) => sum + country.states.length, 0)
const cities = countries.reduce(
  (sum, country) => sum + country.states.reduce((n, state) => n + state.cities.length, 0),
  0,
)
logger.info(`Saved ${countries.length} countries, ${states} states, ${cities} cities`)
