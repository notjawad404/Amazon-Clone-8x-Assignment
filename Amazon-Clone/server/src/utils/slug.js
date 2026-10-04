import slugify from 'slugify'

export function toSlug(text) {
  return slugify(text, { lower: true, strict: true, trim: true })
}

export function withSuffix(baseSlug, isTaken) {
  let slug = baseSlug
  for (let n = 2; isTaken(slug); n += 1) slug = `${baseSlug}-${n}`
  return slug
}
