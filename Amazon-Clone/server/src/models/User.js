import mongoose, { Schema } from 'mongoose'
import { MAX_ADDRESSES, ROLES } from '../utils/constants.js'
import { addressSchema, maxItems } from './shared.js'

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'user' },
    addresses: { type: [addressSchema], validate: maxItems(MAX_ADDRESSES) },
  },
  { timestamps: true },
)

userSchema.index({ email: 1 }, { unique: true })

export const User = mongoose.model('User', userSchema)
