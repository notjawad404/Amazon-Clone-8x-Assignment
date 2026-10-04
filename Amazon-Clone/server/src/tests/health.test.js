import request from 'supertest'
import { describe, expect, it } from 'vitest'
import app from '../app.js'

describe('GET /api/health', () => {
  it('reports the database as connected', async () => {
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok', db: 'connected' })
  })
})

describe('unknown routes', () => {
  it('returns 404 with the standard error shape', async () => {
    const res = await request(app).get('/api/does-not-exist')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Not found: GET /api/does-not-exist' })
  })
})
