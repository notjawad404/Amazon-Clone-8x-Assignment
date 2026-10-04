import bcrypt from 'bcryptjs'
import { User } from '../models/index.js'
import { ApiError } from '../utils/ApiError.js'
import { BCRYPT_COST } from '../utils/constants.js'

const INVALID_CREDENTIALS = 'Your email or password is incorrect.'

let dummyHash

// Comparing against a dummy hash keeps unknown-email sign-ins as slow as wrong passwords,
// so response times don't reveal which emails are registered.
async function getDummyHash() {
  dummyHash ??= await bcrypt.hash('dummy-password-for-timing', BCRYPT_COST)
  return dummyHash
}

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST)
}

function toDeliveryLocation(addresses = []) {
  const address = addresses.find((candidate) => candidate.isDefault)
  return address ? { city: address.city, zip: address.zip } : null
}

export function toPublicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    deliveryLocation: toDeliveryLocation(user.addresses),
  }
}

export async function getProfile(userId) {
  const user = await User.findById(userId).select('name email role addresses').lean()
  if (!user) throw new ApiError(401, 'Please sign in to continue.', { code: 'unauthenticated' })
  return toPublicUser(user)
}

export async function signUp({ name, email, password }) {
  if (await User.exists({ email })) {
    throw new ApiError(409, 'An account with this email already exists. Sign in instead.', {
      code: 'email_taken',
      details: [{ path: 'email', message: 'An account with this email already exists.' }],
    })
  }
  return User.create({ name, email, passwordHash: await hashPassword(password) })
}

export async function signIn({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash')
  const isMatch = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()))
  if (!user || !isMatch) {
    throw new ApiError(401, INVALID_CREDENTIALS, { code: 'invalid_credentials' })
  }
  return user
}

export function findActiveUser(userId) {
  return User.findById(userId).select('name email role').lean()
}
