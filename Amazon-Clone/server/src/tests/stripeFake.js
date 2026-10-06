import Stripe from 'stripe'
import { vi } from 'vitest'

const intents = new Map()
const intentIdsByKey = new Map()
let nextId = 1

// Behaves like Stripe where these tests rely on it: one PaymentIntent per idempotency key.
export const fakeStripe = {
  intents,
  reset() {
    intents.clear()
    intentIdsByKey.clear()
    nextId = 1
    vi.clearAllMocks()
  },
  client: {
    webhooks: new Stripe('sk_test_placeholder').webhooks,
    paymentIntents: {
      create: vi.fn(async (params, { idempotencyKey } = {}) => {
        const existingId = intentIdsByKey.get(idempotencyKey)
        if (existingId) return intents.get(existingId)
        const id = `pi_test_${nextId++}`
        const intent = {
          id,
          client_secret: `${id}_secret_test`,
          status: 'requires_payment_method',
          amount: params.amount,
          currency: params.currency,
          metadata: params.metadata,
        }
        intents.set(id, intent)
        intentIdsByKey.set(idempotencyKey, id)
        return intent
      }),
      retrieve: vi.fn(async (id) => intents.get(id)),
      cancel: vi.fn(async (id) => {
        const intent = intents.get(id)
        intent.status = 'canceled'
        return intent
      }),
    },
    refunds: {
      create: vi.fn(async () => ({ id: 're_test_1', status: 'succeeded' })),
      list: vi.fn(async () => ({ data: [] })),
    },
  },
}

export const stripeModule = { stripe: fakeStripe.client }
