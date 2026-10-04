import app from './app.js'
import { connectDB } from './config/db.js'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'

try {
  const connection = await connectDB()
  logger.info(`MongoDB connected: ${connection.name}`)
} catch (err) {
  logger.error(`MongoDB connection failed: ${err.message}`)
  process.exit(1)
}

app.listen(env.PORT, (err) => {
  if (err) {
    logger.error(`Could not start the API: ${err.message}`)
    process.exit(1)
  }
  logger.info(`API listening on http://localhost:${env.PORT}/api`)
})
