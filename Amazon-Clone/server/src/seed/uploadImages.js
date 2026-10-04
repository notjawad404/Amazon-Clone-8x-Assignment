import { cloudinary } from '../config/cloudinary.js'

export const PRODUCTS_FOLDER = 'amazon-clone/products'
const MAX_CONCURRENT_UPLOADS = 5
const LIST_PAGE_SIZE = 500

async function listExistingImages() {
  const existing = new Map()
  let nextCursor
  do {
    const page = await cloudinary.api.resources({
      type: 'upload',
      prefix: `${PRODUCTS_FOLDER}/`,
      max_results: LIST_PAGE_SIZE,
      next_cursor: nextCursor,
    })
    for (const resource of page.resources) existing.set(resource.public_id, resource.secure_url)
    nextCursor = page.next_cursor
  } while (nextCursor)
  return existing
}

async function uploadOne({ sourceUrl, publicId, folder }) {
  const result = await cloudinary.uploader.upload(sourceUrl, {
    public_id: publicId,
    asset_folder: folder,
    overwrite: false,
    resource_type: 'image',
  })
  return result.secure_url
}

async function uploadWithRetry(job) {
  try {
    return await uploadOne(job)
  } catch {
    return uploadOne(job)
  }
}

async function runPool(jobs, limit, worker) {
  let next = 0
  const run = async () => {
    while (next < jobs.length) {
      const job = jobs[next]
      next += 1
      await worker(job)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, run))
}

function errorMessage(err) {
  return err?.error?.message ?? err?.message ?? String(err)
}

/**
 * Uploads every product image to Cloudinary under amazon-clone/products/<slug>/<n>.
 * Images that already exist are reused, so re-running the import never duplicates them.
 * Returns Map<slug, [{ url, publicId, alt }]>.
 */
export async function uploadProductImages(products, { onProgress = () => {} } = {}) {
  const existing = await listExistingImages()
  const jobs = products.flatMap(({ slug, imageUrls }) =>
    imageUrls.map((url, i) => ({
      sourceUrl: encodeURI(url),
      publicId: `${PRODUCTS_FOLDER}/${slug}/${i + 1}`,
      folder: `${PRODUCTS_FOLDER}/${slug}`,
    })),
  )

  const urls = new Map()
  const failures = []
  const progress = { done: 0, skipped: 0, total: jobs.length }

  await runPool(jobs, MAX_CONCURRENT_UPLOADS, async (job) => {
    try {
      if (existing.has(job.publicId)) {
        urls.set(job.publicId, existing.get(job.publicId))
        progress.skipped += 1
      } else {
        urls.set(job.publicId, await uploadWithRetry(job))
      }
    } catch (err) {
      failures.push(`${job.publicId}: ${errorMessage(err)}`)
    }
    progress.done += 1
    onProgress(progress)
  })

  if (failures.length) {
    throw new Error(`${failures.length} image uploads failed:\n  ${failures.join('\n  ')}`)
  }

  return new Map(
    products.map(({ slug, title, imageUrls }) => [
      slug,
      imageUrls.map((_, i) => {
        const publicId = `${PRODUCTS_FOLDER}/${slug}/${i + 1}`
        return { url: urls.get(publicId), publicId, alt: title }
      }),
    ]),
  )
}
