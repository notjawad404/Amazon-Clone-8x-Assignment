import * as catalogService from '../services/catalog.service.js'
import * as productService from '../services/product.service.js'
import * as suggestionService from '../services/suggestion.service.js'
import { CATALOG_CACHE_CONTROL, SUGGESTIONS_CACHE_CONTROL } from '../utils/constants.js'

export async function getHome(req, res) {
  const home = await catalogService.getHome()
  res.set('Cache-Control', CATALOG_CACHE_CONTROL).json(home)
}

export async function searchProducts(req, res) {
  res.json(await catalogService.searchProducts(req.query))
}

export async function getSuggestions(req, res) {
  const suggestions = await suggestionService.getSuggestions(req.query)
  res.set('Cache-Control', SUGGESTIONS_CACHE_CONTROL).json(suggestions)
}

export async function getProduct(req, res) {
  res.json(await productService.getProduct(req.params.slug))
}

export async function getReviews(req, res) {
  res.json(await productService.getReviews(req.params.slug, req.query))
}

export async function getRelated(req, res) {
  res.json(await productService.getRelated(req.params.slug))
}
