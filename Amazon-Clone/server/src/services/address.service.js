import { User } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { MAX_ADDRESSES } from '../utils/constants.js'
import { normalizeRegion } from './location.service.js'

const ADDRESS_FIELDS = ['fullName', 'line1', 'line2', 'city', 'state', 'zip', 'country', 'phone']

export function toAddress(address) {
  return {
    _id: address._id,
    ...Object.fromEntries(ADDRESS_FIELDS.map((field) => [field, address[field] ?? ''])),
    isDefault: address.isDefault,
  }
}

export function toAddressSnapshot(address) {
  return Object.fromEntries(ADDRESS_FIELDS.map((field) => [field, address[field] ?? '']))
}

function listOf(user) {
  return [...user.addresses]
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
    .map(toAddress)
}

async function loadUser(userId) {
  const user = await User.findById(userId).select('addresses')
  if (!user) throw new ApiError(401, 'Please sign in to continue.', { code: 'unauthenticated' })
  return user
}

function findAddress(user, addressId) {
  const address = user.addresses.id(addressId)
  if (!address) throw new ApiError(404, 'Address not found', { code: 'address_not_found' })
  return address
}

function makeDefault(user, address) {
  for (const candidate of user.addresses) candidate.isDefault = candidate === address
}

export async function listAddresses(userId) {
  return listOf(await loadUser(userId))
}

export async function findUserAddress(userId, addressId) {
  return findAddress(await loadUser(userId), addressId)
}

export async function createAddress(userId, { isDefault, ...fields }) {
  const user = await loadUser(userId)
  if (user.addresses.length >= MAX_ADDRESSES) {
    throw new ApiError(409, `You can save up to ${MAX_ADDRESSES} addresses.`, {
      code: 'address_limit',
    })
  }
  const region = await normalizeRegion(fields)
  user.addresses.push({ ...fields, ...region })
  const address = user.addresses.at(-1)
  if (isDefault || user.addresses.length === 1) makeDefault(user, address)
  await user.save()
  return { address: toAddress(address), addresses: listOf(user) }
}

export async function updateAddress(userId, addressId, fields) {
  const user = await loadUser(userId)
  const address = findAddress(user, addressId)
  const merged = { ...toAddressSnapshot(address), ...fields }
  address.set({ ...fields, ...(await normalizeRegion(merged)) })
  await user.save()
  return listOf(user)
}

export async function deleteAddress(userId, addressId) {
  const user = await loadUser(userId)
  const address = findAddress(user, addressId)
  const wasDefault = address.isDefault
  user.addresses.pull(addressId)
  if (wasDefault && user.addresses.length) makeDefault(user, user.addresses[0])
  await user.save()
  return listOf(user)
}

export async function setDefaultAddress(userId, addressId) {
  const user = await loadUser(userId)
  makeDefault(user, findAddress(user, addressId))
  await user.save()
  return listOf(user)
}
