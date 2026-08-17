import { sequelize } from "../../../Config/database.js";
import { BadRequestError, NotFoundError } from "../../../middleware/ErrorHandler.js";
import Address from "../../../models/address.js";
import Cart from "../../../models/cart.js";
import CartItem from "../../../models/cartItems.js";
import Product from "../../../models/product.js";
import Order from "../../../models/order.js"
import { calculateCartTotals } from "../../../utils/cartCalculator.js";
import { generateOrderId } from "../../../utils/generateOrderId.js"
import OrderItem from "../../../models/orderItem.js";
import Payment from "../../../models/payment.js";
import { razorpay } from "../../../Config/razorpay.js";
import {validateCoupon} from '../../coupon/service/couponService.js'


import {TERMINAL_STATUSES, POLL_INTERVAL_MS,STATUS_SEQUENCE} from "../../../constant/orderStatus.js"
import Coupon from "../../../models/coupon.js";

import { calculateEta } from "../../../utils/distanceCalc.js";
import { calculateEtaService2 } from "../../cart/service/cartService.js";
import CouponRedemption from "../../../models/couponRedemption.js";
import { where } from "sequelize";
// import {fetchFullOrder} from "../../payment/Service/paymentService.js"

// export const placeOrderService = async(userId,{addressId=null,specialInstr,idempotencyKey})=>{
    
//     if(idempotencyKey){
//         const existing = await Order.findOne({
//             where:{
//                 userId,
//                 idempotencyKey
//             },
//               include: [
//         { model: OrderItem, as: 'items'   },
//         { model: Payment,   as: 'payment' },
//         { model: Address,   as: 'address' },
//       ],

//         })

//          if (existing) return existing
//     }
    

// // GET THE ADDRESSS 
//     const address = await Address.findOne({
//         where:{id:addressId,userId},
//     })
//     if(!address) throw NotFoundError("Address");
    
//     const cart = await Cart.findOne({
//         where:{userId},
//          include: [{
//       model:   CartItem,
//       as:      'items',
//       include: [{
//         model:      Product,
//         as:         'product',
//         attributes: [
//           'id', 'name', 'imageUrl',
//           'category', 'basePrice',
//           'discountPrice', 'isAvailable',
//         ],
//          }],
//     }],  
//     })

//     if (!cart || !cart.items || cart.items.length === 0) {
//     throw BadRequestError("Cart is Empty")
//   }

// //   VALIDATE ALL ITEMS ARE AVAILABLE OR NOT 
// const unavailable = cart.items.filter(
//     (item) => !item.product?.isAvailable
//   )
//   if (unavailable.length > 0) {
//     const names = unavailable.map((i) => i.product?.name).join(', ')
//     throw BadRequestError(
//       `Some items are unavailable. Please remove them from cart.`
//     )
//   }

// //   AGAIN NEED TO CALCULATE TOTALS


// // ── 4. Calculate totals ───────────────────────────────────────

//   const orderItems = cart.items.map((item) => {
//     const product   = item.product
//     const unitPrice = product.discountPrice
//       ? parseFloat(product.discountPrice)
//       : parseFloat(product.basePrice)
//     const totalPrice = unitPrice * item.quantity
//     // subtotal += totalPrice
 
//     return {
//       productId:       product.id,
//       productName:     product.name,
//       productImage:    product.imageUrl || null,
//       productCategory: product.category || null,
//       quantity:        item.quantity,
//       unitPrice,
//       totalPrice,
//     }
//   })

// // ── 4. Calculate totals ───────────────────────────────────────
//   const recal = calculateCartTotals(cart.items)
//   const subtotal=recal.subtotal;
//   const totalAmt = recal.totalAmount;
//   const deliveryAmt = recal.deliveryFee;
//   const savingsAmt = recal.totalSavings;


// // PLACE THE ORDER
// const order = await sequelize.transaction(async(t)=>{
//     // GENERATE ORDERID AFTER ALL CHECKS
//     const orderNum= await generateOrderId(userId);
//     console.log(orderNum)
  

//     const newOrder = await Order.create({
//         userId,
//         addressId,
//         orderNumber:orderNum,
//         status:      'CONFIRMED', // COD → confirmed immediately
//         subtotal:    parseFloat(subtotal.toFixed(2)),

//         deliveryAmt,
//         savingsAmt,
//         totalAmt,
//         // couponCode:  couponCode || null,
//         specialInstr: specialInstr || null,
//         idempotencyKey: idempotencyKey || null,
//         placedAt: new Date(),
//     },
//     {transaction:t}
// )

// // Create order items
// await OrderItem.bulkCreate(
//     orderItems.map((item) => ({ ...item, orderId: newOrder.id })),
//     { transaction: t }
// )


// // Create payment record (COD)
// await Payment.create(
//     {
//         orderId:  newOrder.id,
//         method:   'COD',
//         status:   'PENDING', // paid on delivery
//         amount:   totalAmt,
//         currency: 'INR',
//     },
//     { transaction: t }
// )

//     await CartItem.destroy({
//       where:       { cartId: cart.id },
//       transaction: t,
//     })

    
//     return newOrder;

// })

//  return Order.findByPk(order.id, {
//     include: [
//       {
//         model:      OrderItem,
//         as:         'items',
//         attributes: [
//           'id', 'productId', 'productName', 'productImage',
//           'productCategory', 'quantity', 'unitPrice', 'totalPrice',
//         ],
//       },
//       {
//         model:      Payment,
//         as:         'payment',
//         attributes: ['id', 'method', 'status', 'amount', 'currency'],
//       },
//       {
//         model:      Address,
//         as:         'address',
//         attributes: [
//           'label', 'line1', 'line2', 'landmark',
//           'city', 'state', 'pincode', 'country',
//         ],
//       },
//     ],
//   })
    
// }
export const payandplaceOrderService = async(userId,{addressId=null,idempotencyKey,paymentMethod,specialInstructions})=>{
    
  if (!['COD', 'RAZORPAY'].includes(paymentMethod)) {
    throw BadRequestError("paymentMethod must be 'COD' or 'RAZORPAY'")
  }
  console.log(paymentMethod,idempotencyKey,specialInstructions)



  if(!addressId) throw BadRequestError("Address is required.")
  if(!idempotencyKey) throw BadRequestError("idempotencyKey is required for payment orders.")

    if(idempotencyKey){
        const existing = await Order.findOne({
            where:{
                userId,
                idempotencyKey
            },
              include: [
        { model: OrderItem, as: 'items'   },
        { model: Payment,   as: 'payment' },
        { model: Address,   as: 'address' },
      ],

        })

         if (existing) {
              if (paymentMethod === 'RAZORPAY'){
                return{
                  order:existing,
                    razorpayOrderId: existing.payment?.razorpayOrderId,
                 amount:          parseFloat(existing.totalAmt),
                currency:        'INR',
                 keyId:           process.env.RAZORPAY_KEY_ID,
                }
              }
                return existing
         }
      }
    

// GET THE ADDRESSS 
    const address = await Address.findOne({
        where:{id:addressId,userId},
    })
    if(!address) throw NotFoundError("Address");
    
    const cart = await Cart.findOne({
        where:{userId},
         include: [{
      model:   CartItem,
      as:      'items',
      include: [{
        model:      Product,
        as:         'product',
        attributes: [
          'id', 'name', 'imageUrl',
          'category', 'basePrice',
          'discountPrice', 'isAvailable',
        ],
         }],
    }],  
    })

    if (!cart || !cart.items || cart.items.length === 0) {
    throw BadRequestError("Cart is Empty")
  }

//   VALIDATE ALL ITEMS ARE AVAILABLE OR NOT 
const unavailable = cart.items.filter(
    (item) => !item.product?.isAvailable
  )
  if (unavailable.length > 0) {
    const names = unavailable.map((i) => i.product?.name).join(', ')
    throw BadRequestError(
      `Some items are unavailable. Please remove them from cart.`
    )
  }



// ── 4. Calculate totals ───────────────────────────────────────

  const orderItems = cart.items.map((item) => {
    const product   = item.product
    const unitPrice = product.discountPrice
      ? parseFloat(product.discountPrice)
      : parseFloat(product.basePrice)
    const totalPrice = unitPrice * item.quantity
    // subtotal += totalPrice
 
    return {
      productId:       product.id,
      productName:     product.name,
      productImage:    product.imageUrl || null,
      productCategory: product.category || null,
      quantity:        item.quantity,
      unitPrice,
      totalPrice,
    }
  })

// ── 4. Calculate totals ───────────────────────────────────────


const {distanceKm,etaMinutes} = await calculateEtaService2(address.kitchenId,address)

  const recal = calculateCartTotals(cart.items,distanceKm)
  const subtotal=recal.subtotal;
  // const deliveryAmt = recal.deliveryFee;
  const baseDeliveryFee = recal.deliveryFee;
  const savingsAmt = recal.totalSavings;
  console.log("Recalculated totals:", recal)
 
  // COUPON CODE VALIDATION
  let couponId=null
  let couponCode=null
  let couponDiscountAmount=0
  let validatedCoupon = null

  if(cart.appliedCouponId){
    const coupon = await Coupon.findByPk(cart.appliedCouponId)
  

  if(!coupon){
    throw BadRequestError("Applied coupon is no longer available.")
  }

  const result = await validateCoupon(coupon.code,userId,  { subtotal, deliveryFee: baseDeliveryFee },address.kitchenId)

  console.log("result",result)
  if(!result.valid){
    throw BadRequestError(result.message || `Coupon code ${coupon.code} is no longer valid.`)
  }

  validatedCoupon = result.coupon
  couponId = result.coupon.id
  couponCode = result.coupon.code
  couponDiscountAmount = result.discountAmount
  
}


// const effectiveDeliveryFee = validatedCoupon?.discountType === 'FREE_DELIVERY' ? 0 : baseDeliveryFee
const effectiveDeliveryFee = baseDeliveryFee
const totalAmt = subtotal + effectiveDeliveryFee - couponDiscountAmount

console.log(subtotal,totalAmt)


  if(paymentMethod === 'COD'){
// PLACE THE ORDER for cod
const order = await sequelize.transaction(async(t)=>{
    // GENERATE ORDERID AFTER ALL CHECKS
    const orderNum= await generateOrderId(userId);
        const newOrder = await Order.create({
        userId,
        addressId,
        orderNumber:orderNum,
        status:      'PLACED', 
        subtotal:    parseFloat(subtotal.toFixed(2)),
        baseDeliveryFee,
        savingsAmt,
        totalAmt,
        couponCode,
        couponId,
        couponDiscountAmount,
        specialInstr: specialInstructions || null,
        idempotencyKey: idempotencyKey || null,
        placedAt: new Date(),
    },
    {transaction:t}
)

// Create order items
await OrderItem.bulkCreate(
    orderItems.map((item) => ({ ...item, orderId: newOrder.id })),
    { transaction: t }
)


// Create payment record (COD)
await Payment.create(
    {
        orderId:  newOrder.id,
        method:   'COD',
        status:   'PENDING', // paid on delivery
        amount:   totalAmt,
        currency: 'INR',
    },
    { transaction: t }
)
if(couponId){
  await CouponRedemption.create({
    couponId,
    userId,
    orderId:newOrder.id,
    discountAmount:parseFloat(couponDiscountAmount.toFixed(2)),
    status:'ACTIVE',
  },
  {transaction:t})
  await Cart.update({appliedCouponId:null},{where:{userId},transaction:t})
}

    await CartItem.destroy({
      where:       { cartId: cart.id },
      transaction: t,
    })

    
    return newOrder;

})

 return Order.findByPk(order.id, {
    include: [
      {
        model:      OrderItem,
        as:         'items',
        attributes: [
          'id', 'productId', 'productName', 'productImage',
          'productCategory', 'quantity', 'unitPrice', 'totalPrice',
        ],
      },
      {
        model:      Payment,
        as:         'payment',
        attributes: ['id', 'method', 'status', 'amount', 'currency'],
      },
      {
        model:      Address,
        as:         'address',
        attributes: [
          'label', 'line1', 'line2', 'landmark',
          'city', 'state', 'pincode', 'country',
        ],
      },
    ],
  })

}



  // RAZORPAY PAYMENT AND ORDER PLACEMENT
const rzpOrder = await razorpay.orders.create({
  amount: Math.round(totalAmt*100),
  currency: "INR",
  receipt:  `rcpt_${Date.now()}`,
  notes:    { userId, idempotencyKey },
})

const order = await sequelize.transaction(async(t)=>{
    // GENERATE ORDERID AFTER ALL CHECKS
    const orderNum= await generateOrderId(userId);
       const newOrder = await Order.create({
        userId,
        addressId,
        orderNumber:orderNum,
        status:      'PENDING', // COD → confirmed immediately
        subtotal:    parseFloat(subtotal.toFixed(2)),
        baseDeliveryFee,
        savingsAmt,
        totalAmt,
        couponCode,
        couponId,
        couponDiscountAmount,
        specialInstr: specialInstructions || null,
        idempotencyKey: idempotencyKey || null,
        placedAt: new Date(),
    },
    {transaction:t}
)

// Create order items
await OrderItem.bulkCreate(
    orderItems.map((item) => ({ ...item, orderId: newOrder.id })),
    { transaction: t }
)

// Create payment record (RAZORPAY)
await Payment.create(
    {
        orderId:  newOrder.id,
        method:   'RAZORPAY',
        status:   'PENDING', 
        amount:   totalAmt,
        currency: 'INR',
        razorpayOrderId:rzpOrder.id||null,
    },
    { transaction: t }
)

    // await CartItem.destroy({
    //   where:       { cartId: cart.id },
    //   transaction: t,
    // })

    
    return{

      order:newOrder,
      razorpayOrderId:rzpOrder.id,
      razorpayOrderId:rzpOrder.id,
      amount:          parseFloat(totalAmt),
      currency:        'INR',
      keyId:           process.env.RAZORPAY_KEY_ID,
      // order:await fetchFullOrder(newOrder.id),
    } 

}) 

//  return
//  Order.findByPk(order.id, {
//     include: [
//       {
//         model:      OrderItem,
//         as:         'items',
//         attributes: [
//           'id', 'productId', 'productName', 'productImage',
//           'productCategory', 'quantity', 'unitPrice', 'totalPrice',
//         ],
//       },
//       {
//         model:      Payment,
//         as:         'payment',
//         attributes: ['id', 'method', 'status', 'amount', 'currency'],
//       },
//       {
//         model:      Address,
//         as:         'address',
//         attributes: [
//           'label', 'line1', 'line2', 'landmark',
//           'city', 'state', 'pincode', 'country',
//         ],
//       },
//     ],
//   })
const fullOrder = await Order.findByPk(order.order.id, {
    include: [
      {
        model:      OrderItem,
        as:         'items',
        attributes: [
          'id', 'productId', 'productName', 'productImage',
          'productCategory', 'quantity', 'unitPrice', 'totalPrice',
        ],
      },
      {
        model:      Payment,
        as:         'payment',
        attributes: ['id', 'method', 'status', 'amount', 'currency'],
      },
      {
        model:      Address,
        as:         'address',
        attributes: [
          'label', 'line1', 'line2', 'landmark',
          'city', 'state', 'pincode', 'country',
        ],
      },
    ],
  })
  

return {
  order: fullOrder,

  razorpayOrderId:
    rzpOrder.id,

  amount:
    parseFloat(totalAmt),

  currency:
    "INR",

  keyId:
    process.env.RAZORPAY_KEY_ID,
}
    
}

export const getOrderDetailsService = async(userId,{orderId})=>{
      const order = await Order.findOne({
        where:{id:orderId,userId},
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

      if(!order) throw NotFoundError("Order")
        return order;
}



// CANCEL ORDER SERVICE
// export const cancelOrderService = async (userId, orderId, reason) => {

//   const order = await Order.findOne({
//     where: { id: orderId, userId },
//     include: [{ model: Payment, as: 'payment' }],
//   })

//   if (!order) throw NotFoundError('Order')

//   if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
//     throw BadRequestError(`Order cannot be cancelled once it is ${order.status.toLowerCase()}.`)
//   }

//   await sequelize.transaction(async (t) => {
//     await Order.update(
//       {
//         status: 'CANCELLED',
//         cancelledAt: new Date(),
//         cancellationReason: reason || null,
//       },
//       { where: { id: orderId }, transaction: t }
//     )

//     // payment record stays as-is for now (no auto-refund) — just note it needs manual handling if PAID
//     if (order.payment?.status === 'PAID') {
//       await Payment.update(
//         { status: 'REFUND_PENDING' },
//         { where: { orderId }, transaction: t }
//       )
//     }

//     // ── VOID COUPON REDEMPTION — frees up usage count ──
//     if (order.couponId) {
//       await CouponRedemption.update(
//         { status: 'VOIDED' },
//         { where: { orderId, status: 'ACTIVE' }, transaction: t }
//       )
//     }
//   })

//   return fetchFullOrder(orderId)
// }

export const verifyOrderOwnership = async (orderId, userId) => {
  const order = await Order.findOne({ where: { id: orderId, userId } })
  return order ?? null
}

export const trackOrderService= async(userId, orderId ,onStatusChange, onError)=>{
 
   let lastStatus = null

  const interval = setInterval(async () => {
    try {
      const order = await Order.findOne({
        where: { id: orderId, userId },
        attributes: ['status'],
      })

      if (!order) {
        clearInterval(interval)
        onError(new Error('Order not found'))
        return
      }

      if (order.status !== lastStatus) {
        lastStatus = order.status
        onStatusChange({
          orderId,
          status: order.status,
          isFinal: TERMINAL_STATUSES.has(order.status),
        })

        if (TERMINAL_STATUSES.has(order.status)) {
          clearInterval(interval)
        }
      }
    } catch (err) {
      clearInterval(interval)
      onError(err)
    }
  }, POLL_INTERVAL_MS)

  return () => clearInterval(interval) // cleanup fn
}

export const isTerminal = (status) => TERMINAL_STATUSES.has(status)



