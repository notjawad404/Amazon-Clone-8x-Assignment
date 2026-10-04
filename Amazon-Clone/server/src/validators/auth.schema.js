import { z } from 'zod'

const email = z
  .string({ error: 'Enter your email address' })
  .trim()
  .toLowerCase()
  .min(1, 'Enter your email address')
  .max(254, 'Email is too long')
  .pipe(z.email('Enter a valid email address'))

export const signUpSchema = z.strictObject({
  name: z
    .string({ error: 'Enter your name' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters'),
  email,
  password: z
    .string({ error: 'Enter a password' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/[A-Za-z]/, 'Password must include a letter')
    .regex(/\d/, 'Password must include a number'),
})

export const signInSchema = z.strictObject({
  email,
  password: z.string({ error: 'Enter your password' }).min(1, 'Enter your password').max(200),
})
