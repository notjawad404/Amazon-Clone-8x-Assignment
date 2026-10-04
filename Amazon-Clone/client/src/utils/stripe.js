import { loadStripe } from '@stripe/stripe-js'

// Imported only by lazy-loaded pages, so Stripe.js isn't fetched elsewhere.
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
