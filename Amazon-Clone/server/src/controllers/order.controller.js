import * as orderService from '../services/order.service.js'
import * as paymentService from '../services/payment.service.js'
import { ApiError } from '../utils/ApiError.js'

export async function getOrder(req, res) {
  res.json(await orderService.getOrderDetails(req.user._id, req.params.orderNumber))
}

export async function getPaymentIntent(req, res) {
  const order = await orderService.findUserOrder(req.user._id, req.params.orderNumber)
  if (order.status !== 'pending_payment') {
    throw new ApiError(409, 'This order no longer needs payment.', { code: 'order_not_payable' })
  }
  const { clientSecret, status } = await paymentService.ensurePaymentIntent(order)
  res.json({ orderNumber: order.orderNumber, clientSecret, paymentStatus: status })
}
