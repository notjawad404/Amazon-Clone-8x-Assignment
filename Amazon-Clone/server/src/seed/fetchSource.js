import { writeFile } from 'node:fs/promises'
import { logger } from '../utils/logger.js'

const BASE_URL = 'https://dummyjson.com'
const DATA_DIR = new URL('./data/', import.meta.url)

const SOURCES = [
  { path: '/products?limit=0', file: 'dummyjson-products.json' },
  { path: '/products/categories', file: 'dummyjson-categories.json' },
]

async function fetchJson(path) {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`)
  return res.json()
}

for (const { path, file } of SOURCES) {
  const data = await fetchJson(path)
  await writeFile(new URL(file, DATA_DIR), `${JSON.stringify(data, null, 2)}\n`)
  const count = Array.isArray(data) ? data.length : data.products.length
  logger.info(`Saved ${count} records from ${path} to seed/data/${file}`)
}
