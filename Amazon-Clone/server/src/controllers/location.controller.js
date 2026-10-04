import * as locationService from '../services/location.service.js'
import { LOCATIONS_CACHE_CONTROL } from '../utils/constants.js'

export async function listCountries(req, res) {
  res.set('Cache-Control', LOCATIONS_CACHE_CONTROL).json(await locationService.listCountries())
}

export async function listStates(req, res) {
  const states = await locationService.listStates(req.params.countryCode)
  res.set('Cache-Control', LOCATIONS_CACHE_CONTROL).json(states)
}

export async function listCities(req, res) {
  const cities = await locationService.listCities(req.query.country, req.query.state)
  res.set('Cache-Control', LOCATIONS_CACHE_CONTROL).json(cities)
}
