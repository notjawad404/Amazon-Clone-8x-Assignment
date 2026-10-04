import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { connectDB, disconnectDB } from '../config/db.js'
import { env } from '../config/env.js'
import { City, Country } from '../models/index.js'
import { logger } from '../utils/logger.js'

const DATA_FILE = new URL('./data/locations.json', import.meta.url)
const CITY_BATCH_SIZE = 5000

async function loadLocations() {
  try {
    return JSON.parse(await readFile(DATA_FILE, 'utf8'))
  } catch (err) {
    throw new Error(
      `Could not read seed/data/locations.json. Run npm run seed:locations:fetch first. (${err.message})`,
    )
  }
}

/** Imports countries, states, and cities. Does nothing if countries already exist, unless reset. */
export async function importLocations({ reset = false } = {}) {
  if (reset && env.NODE_ENV === 'production') {
    throw new Error('Resetting locations is disabled in production.')
  }
  if (!reset && (await Country.estimatedDocumentCount())) {
    return { skipped: true }
  }

  const countries = await loadLocations()
  await Promise.all([Country.deleteMany({}), City.deleteMany({})])
  await Promise.all([Country.syncIndexes(), City.syncIndexes()])

  await Country.insertMany(
    countries.map(({ code, name, states }) => ({
      code,
      name,
      states: states.map((state) => ({ code: state.code, name: state.name })),
    })),
  )

  const cities = countries.flatMap((country) =>
    country.states.flatMap((state) =>
      state.cities.map((name) => ({ country: country.code, state: state.name, name })),
    ),
  )
  for (let start = 0; start < cities.length; start += CITY_BATCH_SIZE) {
    await City.collection.insertMany(cities.slice(start, start + CITY_BATCH_SIZE), {
      ordered: false,
    })
  }

  const states = countries.reduce((sum, country) => sum + country.states.length, 0)
  return { skipped: false, countries: countries.length, states, cities: cities.length }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await connectDB()
    const result = await importLocations({ reset: process.argv.includes('--reset') })
    if (result.skipped) {
      logger.info('Locations are already imported. Use --reset to re-import (development only).')
    } else {
      logger.info(
        `Imported ${result.countries} countries, ${result.states} states, ${result.cities} cities`,
      )
    }
  } catch (err) {
    logger.error(err.message)
    process.exitCode = 1
  } finally {
    await disconnectDB()
  }
}
