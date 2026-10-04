import { ratingStats } from '../utils/ratings.js'

const MAX_GENERATED_REVIEWS = 12
const REVIEW_HISTORY_YEARS = 1.5
const VERIFIED_PURCHASE_RATE = 0.7

const TEXT = {
  positive: {
    titles: [
      'Love it',
      'Exactly as described',
      'Great value',
      'Highly recommend',
      'Better than expected',
      'Five stars',
      'Very happy with this',
    ],
    sentences: [
      'The quality is excellent for the price.',
      'Arrived quickly and well packaged.',
      'Works exactly as described.',
      'I have been using it every day and it holds up well.',
      'Would definitely buy again.',
      'Looks even better in person.',
      'Bought a second one as a gift.',
    ],
  },
  neutral: {
    titles: ["It's okay", 'Does the job', 'Decent, not great', 'Mixed feelings', 'Average'],
    sentences: [
      'It does what it should, nothing more.',
      'Quality is fine but not outstanding.',
      'A little smaller than I expected.',
      'Good enough for the price.',
      'Took a while to arrive.',
    ],
  },
  negative: {
    titles: [
      'Disappointed',
      'Not worth it',
      'Would not buy again',
      'Poor quality',
      'Not as pictured',
    ],
    sentences: [
      'It did not match the description.',
      'The quality is much lower than I expected.',
      'Stopped working after a few weeks.',
      'Returned it after a few days.',
      'Packaging was damaged on arrival.',
    ],
  },
}

function sentimentFor(rating) {
  if (rating >= 4) return TEXT.positive
  if (rating === 3) return TEXT.neutral
  return TEXT.negative
}

function gaussian(faker) {
  const u = faker.number.float({ min: Number.EPSILON, max: 1 })
  const v = faker.number.float({ min: 0, max: 1 })
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function ratingNear(target, faker) {
  return Math.min(5, Math.max(1, Math.round(target + gaussian(faker))))
}

function generatedReview(productId, target, faker, now) {
  const rating = ratingNear(target, faker)
  const { titles, sentences } = sentimentFor(rating)
  const createdAt = faker.date.past({ years: REVIEW_HISTORY_YEARS, refDate: now })

  return {
    product: productId,
    authorName: faker.person.fullName(),
    rating,
    title: faker.helpers.arrayElement(titles),
    body: faker.helpers.arrayElements(sentences, { min: 1, max: 3 }).join(' '),
    verifiedPurchase: faker.number.float() < VERIFIED_PURCHASE_RATE,
    createdAt,
    updatedAt: createdAt,
  }
}

export function generateReviews(source, { productId, faker, now }) {
  const sourceReviews = source.reviews.map((review) => ({
    product: productId,
    authorName: review.reviewerName,
    rating: review.rating,
    body: review.comment,
    createdAt: new Date(review.date),
    updatedAt: new Date(review.date),
  }))
  const extraCount = faker.number.int({ min: 0, max: MAX_GENERATED_REVIEWS })
  const extra = Array.from({ length: extraCount }, () =>
    generatedReview(productId, source.rating, faker, now),
  )
  const reviews = [...sourceReviews, ...extra]

  return { reviews, stats: ratingStats(reviews.map((review) => review.rating)) }
}
