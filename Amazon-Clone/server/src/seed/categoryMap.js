export const EXCLUDED_SOURCE_CATEGORIES = new Set(['vehicle', 'motorcycle'])

export const DEPARTMENTS = [
  {
    name: 'Electronics',
    slug: 'electronics',
    categories: [
      { name: 'Smartphones', slug: 'smartphones', sourceSlug: 'smartphones' },
      { name: 'Laptops', slug: 'laptops', sourceSlug: 'laptops' },
      { name: 'Tablets', slug: 'tablets', sourceSlug: 'tablets' },
      { name: 'Mobile Accessories', slug: 'mobile-accessories', sourceSlug: 'mobile-accessories' },
    ],
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    categories: [
      { name: "Men's Shirts", slug: 'mens-shirts', sourceSlug: 'mens-shirts' },
      { name: "Men's Shoes", slug: 'mens-shoes', sourceSlug: 'mens-shoes' },
      { name: "Men's Watches", slug: 'mens-watches', sourceSlug: 'mens-watches' },
      { name: "Women's Tops", slug: 'womens-tops', sourceSlug: 'tops' },
      { name: "Women's Dresses", slug: 'womens-dresses', sourceSlug: 'womens-dresses' },
      { name: "Women's Shoes", slug: 'womens-shoes', sourceSlug: 'womens-shoes' },
      { name: "Women's Bags", slug: 'womens-bags', sourceSlug: 'womens-bags' },
      { name: "Women's Jewelry", slug: 'womens-jewelry', sourceSlug: 'womens-jewellery' },
      { name: "Women's Watches", slug: 'womens-watches', sourceSlug: 'womens-watches' },
      { name: 'Sunglasses', slug: 'sunglasses', sourceSlug: 'sunglasses' },
    ],
  },
  {
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    categories: [
      { name: 'Furniture', slug: 'furniture', sourceSlug: 'furniture' },
      { name: 'Home Décor', slug: 'home-decor', sourceSlug: 'home-decoration' },
      { name: 'Kitchen & Dining', slug: 'kitchen-dining', sourceSlug: 'kitchen-accessories' },
    ],
  },
  {
    name: 'Grocery',
    slug: 'grocery',
    categories: [
      { name: 'Grocery & Gourmet Food', slug: 'grocery-gourmet-food', sourceSlug: 'groceries' },
    ],
  },
  {
    name: 'Sports & Outdoors',
    slug: 'sports-outdoors',
    categories: [
      { name: 'Sports & Fitness', slug: 'sports-fitness', sourceSlug: 'sports-accessories' },
    ],
  },
  {
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care',
    categories: [
      { name: 'Makeup', slug: 'makeup', sourceSlug: 'beauty' },
      { name: 'Fragrances', slug: 'fragrances', sourceSlug: 'fragrances' },
      { name: 'Skin Care', slug: 'skin-care', sourceSlug: 'skin-care' },
    ],
  },
]
