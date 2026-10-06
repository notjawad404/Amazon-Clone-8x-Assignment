import { pathToFileURL } from 'node:url'
import { connectDB, disconnectDB } from '../config/db.js'
import { Order } from '../models/index.js'
import { logger } from '../utils/logger.js'

// Delivered first, so each run moves an order only one step.
const STEPS = [
  { from: 'shipped', to: 'delivered', note: 'Delivered' },
  { from: 'paid', to: 'shipped', note: 'Shipped' },
]

/** Stands in for the warehouse: shipped → delivered, then paid → shipped. Returns the counts. */
export async function advanceOrders(now = new Date()) {
  const counts = {}
  for (const { from, to, note } of STEPS) {
    const orders = await Order.find({ status: from })
    for (const order of orders) {
      order.transitionTo(to, { at: now, note })
      await order.save()
    }
    counts[to] = orders.length
  }
  return counts
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await connectDB()
    const counts = await advanceOrders()
    logger.info(`Shipped ${counts.shipped} order(s); delivered ${counts.delivered} order(s).`)
  } catch (err) {
    logger.error(err.message)
    process.exitCode = 1
  } finally {
    await disconnectDB()
  }
}
