import express, { Router } from 'express'
import * as webhookController from '../controllers/webhook.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = Router()

// Stripe signs the exact bytes it sent, so this route needs the raw body, not parsed JSON.
router.post(
  '/stripe',
  express.raw({ type: 'application/json', limit: '1mb' }),
  asyncHandler(webhookController.handleStripe),
)

export default router
