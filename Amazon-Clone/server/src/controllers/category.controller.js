import * as catalogService from '../services/catalog.service.js'
import { CATALOG_CACHE_CONTROL } from '../utils/constants.js'

export async function listCategories(req, res) {
  const categories = await catalogService.getCategoryTree()
  res.set('Cache-Control', CATALOG_CACHE_CONTROL).json(categories)
}
