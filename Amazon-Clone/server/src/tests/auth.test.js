import cookieParser from 'cookie-parser'
import express from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { afterEach, describe, expect, it } from 'vitest'
import app from '../app.js'
import { errorHandler } from '../middleware/errorHandler.js'
import { protect } from '../middleware/protect.js'
import { authLimiterStore } from '../middleware/rateLimit.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { User } from '../models/index.js'
import { hashPassword } from '../services/auth.service.js'
import { AUTH_COOKIE, signToken } from '../utils/token.js'

const NEW_USER = { name: 'Jane Doe', email: 'jane@example.com', password: 'Secret123' }

function signUp(agent, body = NEW_USER) {
  return agent.post('/api/auth/signup').send(body)
}

function authCookie(res) {
  return res.headers['set-cookie']?.find((cookie) => cookie.startsWith(`${AUTH_COOKIE}=`))
}

afterEach(() => {
  authLimiterStore.resetAll()
})

describe('POST /api/auth/signup', () => {
  it('creates the user, signs them in, and /me returns them', async () => {
    const agent = request.agent(app)

    const res = await signUp(agent)

    expect(res.status).toBe(201)
    expect(res.body).toEqual({
      _id: expect.any(String),
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'user',
      deliveryLocation: null,
    })
    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.email).toBe('jane@example.com')
  })

  it('sets an httpOnly, sameSite=lax cookie and never returns the token or hash', async () => {
    const res = await signUp(request(app))

    expect(authCookie(res)).toMatch(/HttpOnly/)
    expect(authCookie(res)).toMatch(/SameSite=Lax/)
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|token/)
  })

  it('normalizes the email and stores a bcrypt hash', async () => {
    await signUp(request(app), { ...NEW_USER, email: '  Jane@Example.COM ' })

    const user = await User.findOne({ email: 'jane@example.com' }).select('+passwordHash').lean()
    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/)
  })

  it('returns 409 for an email that is already registered', async () => {
    await signUp(request(app))

    const res = await signUp(request(app), { ...NEW_USER, email: 'JANE@example.com' })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe('email_taken')
  })

  it.each([
    ['a short password', { password: 'abc1' }, 'password'],
    ['a password without a number', { password: 'abcdefgh' }, 'password'],
    ['a password without a letter', { password: '12345678' }, 'password'],
    ['an invalid email', { email: 'not-an-email' }, 'email'],
    ['a one-letter name', { name: 'J' }, 'name'],
  ])('rejects %s with field details', async (_, override, field) => {
    const res = await signUp(request(app), { ...NEW_USER, ...override })

    expect(res.status).toBe(400)
    expect(res.body.details.map((detail) => detail.path)).toContain(field)
  })

  it('rejects unknown fields so the client cannot set its role', async () => {
    const res = await signUp(request(app), { ...NEW_USER, role: 'admin' })

    expect(res.status).toBe(400)
    expect(await User.countDocuments()).toBe(0)
  })
})

describe('POST /api/auth/signin', () => {
  it('signs in with the right password', async () => {
    await signUp(request(app))
    const agent = request.agent(app)

    const res = await agent.post('/api/auth/signin').send({
      email: NEW_USER.email,
      password: NEW_USER.password,
    })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Jane Doe')
    expect((await agent.get('/api/auth/me')).status).toBe(200)
  })

  it('returns the same 401 for a wrong password and an unknown email', async () => {
    await signUp(request(app))

    const wrongPassword = await request(app)
      .post('/api/auth/signin')
      .send({ email: NEW_USER.email, password: 'Wrong1234' })
    const unknownEmail = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'nobody@example.com', password: 'Wrong1234' })

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.status).toBe(401)
      expect(res.body.message).toBe('Your email or password is incorrect.')
      expect(authCookie(res)).toBeUndefined()
    }
  })

  it('rate limits after 10 attempts', async () => {
    const attempt = () =>
      request(app).post('/api/auth/signin').send({ email: 'x@example.com', password: 'Wrong1234' })
    for (let i = 0; i < 10; i += 1) await attempt()

    const res = await attempt()

    expect(res.status).toBe(429)
    expect(res.body.code).toBe('rate_limited')
  })
})

describe('POST /api/auth/signout', () => {
  it('clears the cookie so /me returns 401', async () => {
    const agent = request.agent(app)
    await signUp(agent)

    const res = await agent.post('/api/auth/signout')

    expect(res.status).toBe(204)
    expect(authCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/)
    expect((await agent.get('/api/auth/me')).status).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  it('returns 401 without a cookie', async () => {
    const res = await request(app).get('/api/auth/me')

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Please sign in to continue.')
  })

  it('returns 401 for a token signed with another secret', async () => {
    const user = await User.create({ ...NEW_USER, passwordHash: 'x' })
    const forged = jwt.sign({}, 'some-other-secret-that-is-long-enough', {
      subject: String(user._id),
    })

    const res = await request(app).get('/api/auth/me').set('Cookie', `${AUTH_COOKIE}=${forged}`)

    expect(res.status).toBe(401)
  })

  it('returns 401 when the user no longer exists', async () => {
    const user = await User.create({ ...NEW_USER, passwordHash: 'x' })
    const token = signToken(user._id)
    await User.deleteOne({ _id: user._id })

    const res = await request(app).get('/api/auth/me').set('Cookie', `${AUTH_COOKIE}=${token}`)

    expect(res.status).toBe(401)
  })

  it('returns only the city and zip of the default address', async () => {
    const address = {
      fullName: 'Jane Doe',
      line1: '1 Main St',
      state: 'WA',
      phone: '2065550100',
    }
    const user = await User.create({
      ...NEW_USER,
      passwordHash: 'x',
      addresses: [
        { ...address, city: 'Tacoma', zip: '98402' },
        { ...address, city: 'Seattle', zip: '98101', isDefault: true },
      ],
    })

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${AUTH_COOKIE}=${signToken(user._id)}`)

    expect(res.status).toBe(200)
    expect(res.body.deliveryLocation).toEqual({ city: 'Seattle', zip: '98101' })
    expect(JSON.stringify(res.body)).not.toMatch(/1 Main St|2065550100/)
  })
})

describe('requireAdmin', () => {
  const adminApp = express()
    .use(cookieParser())
    .get('/admin', protect, requireAdmin, (req, res) => res.json({ ok: true }))
    .use(errorHandler)

  async function tokenFor(role) {
    const user = await User.create({
      ...NEW_USER,
      email: `${role}@example.com`,
      role,
      passwordHash: await hashPassword('Secret123'),
    })
    return `${AUTH_COOKIE}=${signToken(user._id)}`
  }

  it('returns 403 for a signed-in user who is not an admin', async () => {
    const res = await request(adminApp)
      .get('/admin')
      .set('Cookie', await tokenFor('user'))

    expect(res.status).toBe(403)
  })

  it('lets an admin through', async () => {
    const res = await request(adminApp)
      .get('/admin')
      .set('Cookie', await tokenFor('admin'))

    expect(res.status).toBe(200)
  })
})
