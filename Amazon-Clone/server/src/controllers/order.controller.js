import * as orderService from '../services/order.service.js'
import * as orderActions from '../services/orderActions.service.js'
import * as orderHistory from '../services/orderHistory.service.js'
import * as paymentService from '../services/payment.service.js'
import * as paymentSync from '../services/paymentSync.service.js'
import { ApiError } from '../utils/ApiError.js'

export async function listOrders(req, res) {
  await paymentSync.syncPendingPayments({ user: req.user._id })
  res.json(await orderHistory.listOrders(req.user._id, req.query))
}

export async function getOrder(req, res) {
  const { orderNumber } = req.params
  await paymentSync.syncPendingPayments({ user: req.user._id, orderNumber })
  res.json(await orderHistory.getOrderDetails(req.user._id, orderNumber))
}

export async function cancelOrder(req, res) {
  await orderActions.cancelOrder(req.user._id, req.params.orderNumber)
  res.json(await orderHistory.getOrderDetails(req.user._id, req.params.orderNumber))
}

export async function buyAgain(req, res) {
  res.json(await orderActions.buyAgain(req.user._id, req.params.orderNumber))
}

export async function getPaymentIntent(req, res) {
  const order = await orderService.findUserOrder(req.user._id, req.params.orderNumber)
  if (order.status !== 'pending_payment') {
    throw new ApiError(409, 'This order no longer needs payment.', { code: 'order_not_payable' })
  }
  const { clientSecret, status } = await paymentService.ensurePaymentIntent(order)
  res.json({ orderNumber: order.orderNumber, clientSecret, paymentStatus: status })
}
