import { BadRequestError, NotFoundError } from "../../../middleware/ErrorHandler.js"
import Order from "../../../models/order.js"
import Payment from "../../../models/payment.js"
import {razorpay} from "../../../Config/razorpay.js"
import OrderItem from "../../../models/orderItem.js"
import Address from "../../../models/address.js"
import { sequelize } from "../../../Config/database.js"
import crypto from 'crypto'
import {createHmac} from 'crypto'
import CartItem from "../../../models/cartItems.js"
import Cart from "../../../models/cart.js"
// function for fetch full order
export const fetchFullOrder=(orderId)=>{
    Order.findByPk(orderId,{
        include:[
            {
            model:OrderItem,
            as:'items',
            attributes:[
                'id', 'productId', 'productName', 'productImage',
          'productCategory', 'quantity', 'unitPrice', 'totalPrice',
            ]
        },
      {
        model:      Payment,
        as:         'payment',
        attributes: [
          'id', 'method', 'status', 'amount', 'currency',
          'razorpayOrderId', 'razorpayPaymentId', 'paidAt',
          'failureMessage', 'refundId', 'refundAmt', 'refundedAt',
        ],
      },
    {
        model:Address,
        as:'address',
        attributes:[
              'label', 'line1', 'line2', 'landmark',
          'city', 'state', 'pincode', 'country',
        ]
    },
],
    })

}

export const createPaymentOrderService = async(userId,orderId)=>{
    const order = await Order.findOne({
        where:{userId,
            id:orderId,
            status:'PENDING',
        },
        include:[{model:Payment, as :'payment'}],
    })

    if(!order) throw NotFoundError("Order");
    const payment=order.payment
    if(!payment) throw BadRequestError('Payment record not found');

    if(payment.razorpayOrderId){
        return{
            razorpayOrderId:payment.razorpayOrderId,
            amount: parseFloat(order.totalAmt),
            currency:'INR',
            keyId:process.env.RAZORPAY_KEY_ID,
            order:await fetchFullOrder(orderID),
        }
    }
    const rzpOrder = await razorpay.orders.create({
        amount:Math.round(parseFloat(order.totalAmt)*100),
        currency:"INR",
        receipt:  `rcpt_${order.orderNumber}`,
        notes:{orderId:order.id,userId},

    })

    await payment.update({razorpayOrderId:rzpOrder.id})
    return{
        razorpayOrderId:rzpOrder.id,
        amount:parseFloat(order.totalAmt),
        currency:'INR',
        keyId:process.env.RAZORPAY_KEY_ID,
        order:await fetchFullOrder(orderId)
    }
}
export const verifyPaymentService = async(userId,{orderId, razorpayOrderId,razorpayPaymentId,razorpaySignature})=>{

    if(!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature){
        throw BadRequestError("Missing required payment details");
    }

    const order = await Order.findOne({
        where:{id:orderId,userId},
        include:[{model:Payment, as :'payment'}],

    })
    if(!order) throw NotFoundError('Order');

    if(order.payment?.status ==='PAID'){
        return fetchFullOrder(orderId);
    }
    const rawBody =   `${razorpayOrderId}|${razorpayPaymentId}`
    const expected = crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET).update(rawBody).digest('hex')

    if(expected !==razorpaySignature){
        throw BadRequestError("Invalid payment signature");
    }
    

    // CONFM ORDER + PAYMENT
    await sequelize.transaction(async(t)=>{
        await Payment.update({
            status:'PAID',
            razorpayPaymentId,
            razorpaySignature,
            paidAt: new Date(),
        },
        {where:{orderId},transaction:t}
       
    )
    await Order.update(
        {status:'CONFIRMED',
            confirmedAt: new Date(),
        },
        {where:{id:orderId},transaction:t}
    )

    const getCart = await Cart.findOne({
        where:{userId},
    })
await CartItem.destroy({
      where:       { cartId:getCart.id },
      transaction: t,
    })
    
   
  
    })

    return fetchFullOrder(orderId);
}
export const handleWebhookService = async(rawBody,signature)=>{
    const expected = crypto.createHmac('sha256',process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');

    if(expected !==signature){
        throw BadRequestError("Invalid Webhook signature");
    }

    const event = JSON.parse(rawBody)
    const eventType = event.event

    console.log(event)

    if(eventType ==='payment.captured'){
        const entity = event.payload.payment.entity
        const rzpOrderId = entity.order_id
        const rzpPaymentId = entity.id
        
        const payment = await Payment.findeOne({
            where:{razorpayOrderId:rzpOrderId}
        })
        if(!payment){
            console.error("Webhook: no payment found for, " ,rzpOrderId)
            return {received:true}
        }

            if (payment.status === 'PAID') return { received: true }
 
await sequelize.transaction(async (t) => {
      await payment.update(
        { status: 'PAID', razorpayPaymentId: rzpPaymentId, paidAt: new Date() },
        { transaction: t }
      )
      await Order.update(
        { status: 'CONFIRMED', confirmedAt: new Date() },
        { where: { id: payment.orderId }, transaction: t }
      )
    })
    }

    if(eventType ==='payment.failed'){
          const entity     = event.payload.payment.entity
    const rzpOrderId = entity.order_id
    const payment = await Payment.findOne({
      where: { razorpayOrderId: rzpOrderId },
    })

    
      if (payment && payment.status === 'PENDING') {
      await payment.update({
        status:         'FAILED',
        failedAt:       new Date(),
        failureMessage: entity.error_description || 'Payment failed',
      })
      console.log('❌ Webhook payment failed:', payment.orderId)
    }
  
    }

    if(eventType ==='refund.processed'){

        const entity = event.payload.refund.entity
        const rzpOrderId = event.payload.payment.entity.order_id
 
    const payment = await Payment.findOne({
      where: { razorpayOrderId: rzpOrderId },
    })


        if (payment) {
      await sequelize.transaction(async (t) => {
        await payment.update(
          {
            status:     'REFUNDED',
            refundId:   entity.id,
            refundAmt:  parseFloat(entity.amount) / 100,
            refundedAt: new Date(),
          },
          { transaction: t }
        )
        await Order.update(
          { status: 'REFUNDED' },
          { where: { id: payment.orderId }, transaction: t }
        )
      })

      console.log('💸 Webhook refund processed:', payment.orderId)
    }
    }
    return {received:true}
     
    
}