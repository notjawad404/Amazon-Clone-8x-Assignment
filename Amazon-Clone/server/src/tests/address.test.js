import { beforeEach, describe, expect, it } from 'vitest'
import { ADDRESS, createLocations, createShopper } from './checkoutHelpers.js'

const path = '/api/users/me/addresses'

beforeEach(async () => {
  await createLocations()
})

describe('/api/users/me/addresses', () => {
  it('makes the first address the default and returns the list default-first', async () => {
    const { as } = await createShopper({ withAddress: false })

    const first = await as('post', path).send(ADDRESS)
    const second = await as('post', path).send({ ...ADDRESS, city: 'Memphis', isDefault: true })

    expect(first.status).toBe(201)
    expect(first.body.address.isDefault).toBe(true)
    expect(second.body.addresses.map((a) => [a.city, a.isDefault])).toEqual([
      ['Memphis', true],
      ['Nashville', false],
    ])
  })

  it('stores the full state name, whether the code or the name was sent', async () => {
    const { as } = await createShopper({ withAddress: false })

    const byCode = await as('post', path).send({ ...ADDRESS, state: 'tn' })
    const byName = await as('post', path).send({ ...ADDRESS, state: 'washington', city: 'Seattle' })

    expect(byCode.body.address.state).toBe('Tennessee')
    expect(byName.body.address.state).toBe('Washington')
  })

  it('accepts other countries, their postal codes, and free text where no states exist', async () => {
    const { as } = await createShopper({ withAddress: false })

    const canada = await as('post', path).send({
      ...ADDRESS,
      country: 'ca',
      state: 'Ontario',
      city: 'Toronto',
      zip: 'M5V 2T6',
    })
    const antarctica = await as('post', path).send({
      ...ADDRESS,
      country: 'AQ',
      state: 'Ross Dependency',
      city: 'McMurdo Station',
      zip: '',
    })

    expect(canada.status).toBe(201)
    expect(canada.body.address).toMatchObject({ country: 'CA', state: 'Ontario', zip: 'M5V 2T6' })
    expect(antarctica.status).toBe(201)
    expect(antarctica.body.address.state).toBe('Ross Dependency')
  })

  it.each([
    [{ country: 'ZZ' }, 'country'],
    [{ state: 'Ontario' }, 'state'],
    [{ state: '' }, 'state'],
    [{ zip: '1234' }, 'zip'],
  ])('rejects %j with a field error on %s', async (change, field) => {
    const { as } = await createShopper({ withAddress: false })

    const res = await as('post', path).send({ ...ADDRESS, ...change })

    expect(res.status).toBe(400)
    expect(res.body.details.map((detail) => detail.path)).toContain(field)
  })

  it('updates one field without clearing the others', async () => {
    const { as } = await createShopper({ withAddress: false })
    const created = await as('post', path).send(ADDRESS)

    const res = await as('patch', `${path}/${created.body.address._id}`).send({
      phone: '615-555-0199',
    })

    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({ phone: '615-555-0199', state: 'Tennessee', zip: '37217' })
  })

  it('moves the default to another address when the default is deleted', async () => {
    const { as } = await createShopper()
    const added = await as('post', path).send({ ...ADDRESS, city: 'Memphis' })
    const defaultId = added.body.addresses.find((a) => a.isDefault)._id

    const res = await as('delete', `${path}/${defaultId}`)

    expect(res.body).toEqual([expect.objectContaining({ city: 'Memphis', isDefault: true })])
  })

  it('caps the list at 10 and hides other users’ addresses', async () => {
    const { as } = await createShopper()
    const other = await createShopper({ email: 'other@example.com' })
    const [mine] = (await as('get', path)).body

    for (let i = 0; i < 9; i += 1) await as('post', path).send(ADDRESS)
    const eleventh = await as('post', path).send(ADDRESS)
    const stolen = await other.as('delete', `${path}/${mine._id}`)

    expect(eleventh.status).toBe(409)
    expect(stolen.status).toBe(404)
  })
})

describe('/api/locations', () => {
  it('lists countries by name, states for a country, and cities for a state', async () => {
    const countries = await createShopper().then(({ as }) => as('get', '/api/locations/countries'))
    const { as } = await createShopper({ email: 'other@example.com' })
    const states = await as('get', '/api/locations/countries/us/states')
    const cities = await as('get', '/api/locations/cities').query({
      country: 'US',
      state: 'Tennessee',
    })
    const missing = await as('get', '/api/locations/countries/ZZ/states')

    expect(countries.headers['cache-control']).toBe('public, max-age=86400')
    expect(countries.body).toEqual([
      { code: 'AQ', name: 'Antarctica', hasStates: false },
      { code: 'CA', name: 'Canada', hasStates: true },
      { code: 'US', name: 'United States', hasStates: true },
    ])
    expect(states.body).toEqual([
      { code: 'TN', name: 'Tennessee' },
      { code: 'WA', name: 'Washington' },
    ])
    expect(cities.body).toEqual(['Memphis', 'Nashville'])
    expect(missing.status).toBe(404)
  })
})
