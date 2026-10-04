import { Category, Product } from '../models/index.js'

export async function createCategoryTree() {
  const department = await Category.create({ name: 'Electronics', slug: 'electronics' })
  const category = await Category.create({
    name: 'Smartphones',
    slug: 'smartphones',
    parent: department._id,
  })
  return { department, category }
}

export function variant(overrides = {}) {
  return {
    sku: `SKU-${Math.random().toString(36).slice(2, 10)}`,
    label: 'Standard',
    priceCents: 1000,
    stock: 5,
    ...overrides,
  }
}

export function productInput(category, overrides = {}) {
  return {
    title: 'Test Phone',
    category: category._id,
    description: 'A phone used in tests.',
    images: [{ url: 'https://res.cloudinary.com/demo/image/upload/phone.jpg', publicId: 'phone' }],
    variants: [variant()],
    status: 'active',
    ...overrides,
  }
}

export function createProduct(category, overrides = {}) {
  return Product.create(productInput(category, overrides))
}
