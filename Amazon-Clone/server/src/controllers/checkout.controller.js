import * as checkoutService from '../services/checkout.service.js'

export async function startCheckout(req, res) {
  res.status(201).json(await checkoutService.startCheckout(req.user._id, req.body))
}

export async function getCheckout(req, res) {
  res.json(await checkoutService.getCheckout(req.user._id, req.params.checkoutId))
}

export async function updateCheckout(req, res) {
  res.json(await checkoutService.updateCheckout(req.user._id, req.params.checkoutId, req.body))
}

export async function placeOrder(req, res) {
  res.json(await checkoutService.placeOrder(req.user._id, req.params.checkoutId, req.body))
}
