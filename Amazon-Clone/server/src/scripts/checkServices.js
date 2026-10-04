import { readFileSync } from 'node:fs'
import dotenv from 'dotenv'
import { cloudinary } from '../config/cloudinary.js'
import { connectDB, disconnectDB } from '../config/db.js'
import { env } from '../config/env.js'
import { stripe } from '../config/stripe.js'
import { logger } from '../utils/logger.js'

const CLIENT_ENV_PATH = new URL('../../../client/.env', import.meta.url)

const checks = {
  async mongodb() {
    const connection = await connectDB()
    try {
      const hello = await connection.db.admin().command({ hello: 1 })
      if (!hello.setName) {
        throw new Error(
          'connected, but not to a replica set. Transactions need Atlas or a local replica set',
        )
      }
      return `connected to database "${connection.name}" (replica set ${hello.setName})`
    } finally {
      await disconnectDB()
    }
  },

  async stripe() {
    const balance = await stripe.balance.retrieve()
    if (balance.livemode) throw new Error('the key is a live mode key. Use a test mode key')
    const currencies = balance.available.map((b) => b.currency.toUpperCase()).join(', ')
    return `test mode secret key accepted (currencies: ${currencies || 'none yet'})`
  },

  async cloudinary() {
    await cloudinary.api.ping()
    const usage = await cloudinary.api.usage()
    return `credentials accepted for cloud "${env.CLOUDINARY_CLOUD_NAME}" (plan: ${usage.plan})`
  },
}

function readClientEnv() {
  try {
    return dotenv.parse(readFileSync(CLIENT_ENV_PATH))
  } catch {
    return null
  }
}

function getConfigWarnings(selected) {
  const warnings = []
  const clientEnv = readClientEnv()
  if (!clientEnv) return ['client/.env not found. Copy client/.env.example to client/.env']

  if (selected.includes('stripe')) {
    if (!/^pk_test_\w{10,}$/.test(clientEnv.VITE_STRIPE_PUBLISHABLE_KEY ?? '')) {
      warnings.push(
        'client/.env: VITE_STRIPE_PUBLISHABLE_KEY should be a test mode key (pk_test_...)',
      )
    }
    if (!env.STRIPE_WEBHOOK_SECRET) {
      warnings.push(
        'server/.env: STRIPE_WEBHOOK_SECRET is empty (get it with `stripe listen --print-secret`)',
      )
    }
  }
  if (
    selected.includes('cloudinary') &&
    clientEnv.VITE_CLOUDINARY_CLOUD_NAME !== env.CLOUDINARY_CLOUD_NAME
  ) {
    warnings.push(
      'client/.env: VITE_CLOUDINARY_CLOUD_NAME does not match CLOUDINARY_CLOUD_NAME in server/.env',
    )
  }
  return warnings
}

function errorMessage(err) {
  // Cloudinary rejects with { error: { message } } instead of an Error
  return err?.error?.message ?? err?.message ?? String(err)
}

async function run() {
  const requested = process.argv.slice(2)
  const unknown = requested.filter((name) => !checks[name])
  if (unknown.length) {
    logger.error(`Unknown service: ${unknown.join(', ')}. Use: ${Object.keys(checks).join(', ')}`)
    return 1
  }

  const selected = requested.length ? requested : Object.keys(checks)
  let failures = 0

  for (const name of selected) {
    try {
      logger.info(`✔ ${name.padEnd(11)} ${await checks[name]()}`)
    } catch (err) {
      failures += 1
      logger.error(`✖ ${name.padEnd(11)} ${errorMessage(err)}`)
    }
  }
  for (const warning of getConfigWarnings(selected)) {
    logger.warn(`⚠ ${warning}`)
  }

  logger.info(
    failures ? `\n${failures} of ${selected.length} checks failed` : '\nAll checks passed',
  )
  return failures ? 1 : 0
}

process.exit(await run())
