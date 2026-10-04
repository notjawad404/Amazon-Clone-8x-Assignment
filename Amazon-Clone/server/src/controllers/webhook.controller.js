import * as webhookService from '../services/stripeWebhook.service.js'

export async function handleStripe(req, res) {
  const event = webhookService.verifyEvent(req.body, req.headers['stripe-signature'])
  await webhookService.handleEvent(event)
  res.json({ received: true })
}
