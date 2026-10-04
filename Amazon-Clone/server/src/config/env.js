import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

// Tests set their own values and must never pick up real credentials.
if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true })
}

const required = z.string().trim().min(1, 'is required')

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.url().default('http://localhost:5173'),
  MONGODB_URI: required
    .regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://')
    .refine((uri) => !/[<>]/.test(uri), 'still contains <placeholder> values'),
  JWT_SECRET: required.min(32, 'must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  STRIPE_SECRET_KEY: required.regex(/^sk_test_\w{10,}$/, 'must be a test mode key (sk_test_...)'),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .trim()
    .regex(/^(whsec_\w+)?$/, 'must start with whsec_')
    .default(''),
  CLOUDINARY_CLOUD_NAME: required,
  CLOUDINARY_API_KEY: required,
  CLOUDINARY_API_SECRET: required,
})

function loadEnv() {
  const result = envSchema.safeParse(process.env)
  if (result.success) return Object.freeze(result.data)

  console.error('Invalid environment variables in server/.env:')
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

export const env = loadEnv()
