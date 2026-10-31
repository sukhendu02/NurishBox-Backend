// src/utils/paymentMode.js
// The ONLY place that interprets your Payment model.
// ASSUMED fields: payment.method ('COD' for cash on delivery) and payment.status ('PAID' once paid).
// If your Payment fields/values differ, change this one function.
export function resolvePaymentMode(payment, order) {
    const method = String(payment?.method || '').toUpperCase()
    const status = String(payment?.status || '').toUpperCase()
    const isCod = method === 'COD' || method === 'CASH_ON_DELIVERY'
    const alreadyPaid = ['PAID', 'SUCCESS', 'COMPLETED', 'CAPTURED'].includes(status)
    return {
      paymentMode: isCod ? 'COD' : 'ONLINE',
      codAmount: isCod && !alreadyPaid ? Number(order.totalAmt) : 0,
    }
  }