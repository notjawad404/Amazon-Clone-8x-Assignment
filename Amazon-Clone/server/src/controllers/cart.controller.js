import * as cartService from '../services/cart.service.js'

export async function getCart(req, res) {
  res.json(await cartService.getCart(req.user._id))
}

export async function addItem(req, res) {
  res.status(201).json(await cartService.addItem(req.user._id, req.body))
}

export async function updateItem(req, res) {
  res.json(await cartService.updateItem(req.user._id, req.params.itemId, req.body))
}

export async function removeItem(req, res) {
  res.json(await cartService.removeItem(req.user._id, req.params.itemId))
}

export async function mergeCart(req, res) {
  res.json(await cartService.mergeGuestItems(req.user._id, req.body.items))
}

export async function previewCart(req, res) {
  res.json(await cartService.previewGuestItems(req.body.items))
}
