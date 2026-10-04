import mongoose from 'mongoose'
import { logger } from '../utils/logger.js'
import { env } from './env.js'

mongoose.set('strictQuery', true)
mongoose.set('sanitizeFilter', true)

let isClosing = false

mongoose.connection.on('disconnected', () => {
  if (!isClosing) logger.warn('MongoDB disconnected')
})
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'))

export async function connectDB(uri = env.MONGODB_URI) {
  await mongoose.connect(uri, {
    autoIndex: env.NODE_ENV !== 'production',
    serverSelectionTimeoutMS: 10_000,
  })
  return mongoose.connection
}

export function disconnectDB() {
  isClosing = true
  return mongoose.disconnect()
}

export function isDBConnected() {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected
}
