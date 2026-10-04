import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { afterAll, beforeAll } from 'vitest'

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })

Object.assign(process.env, {
  NODE_ENV: 'test',
  MONGODB_URI: replSet.getUri(),
  JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-chars',
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
  CLOUDINARY_CLOUD_NAME: 'test-cloud',
  CLOUDINARY_API_KEY: 'test-key',
  CLOUDINARY_API_SECRET: 'test-secret',
})

const { connectDB, disconnectDB } = await import('../config/db.js')

beforeAll(async () => {
  await connectDB()
})

afterAll(async () => {
  await disconnectDB()
  await replSet.stop()
})
