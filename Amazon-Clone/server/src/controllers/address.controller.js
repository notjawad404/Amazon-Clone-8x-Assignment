import * as addressService from '../services/address.service.js'

export async function listAddresses(req, res) {
  res.json(await addressService.listAddresses(req.user._id))
}

export async function createAddress(req, res) {
  res.status(201).json(await addressService.createAddress(req.user._id, req.body))
}

export async function updateAddress(req, res) {
  res.json(await addressService.updateAddress(req.user._id, req.params.addressId, req.body))
}

export async function deleteAddress(req, res) {
  res.json(await addressService.deleteAddress(req.user._id, req.params.addressId))
}

export async function setDefaultAddress(req, res) {
  res.json(await addressService.setDefaultAddress(req.user._id, req.params.addressId))
}
