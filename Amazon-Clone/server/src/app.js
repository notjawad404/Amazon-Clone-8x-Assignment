import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { apiLimiter } from './middleware/rateLimit.js'
import routes from './routes/index.js'

const app = express()

app.set('trust proxy', 1)
app.use(helmet())
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())
app.use(cors({ origin: env.CLIENT_URL, credentials: true }))
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}
app.use('/api', apiLimiter, routes)
app.use(notFound)
app.use(errorHandler)

export default app
