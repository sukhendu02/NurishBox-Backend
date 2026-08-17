import { Op } from 'sequelize'
import Coupon from '../../../models/coupon.js'
import CouponRedemption from '../../../models/couponRedemption.js'
import Order from '../../../models/order.js'
import Cart from '../../../models/cart.js'
import CartItem from '../../../models/cartItems.js'
import Product from '../../../models/product.js'
import { getCartService2, getCartWithItems } from '../../cart/service/cartService.js'
import { start } from 'node:repl'


export const validateCoupon= async ( code, userId, cart, kitchenId )=> {
 
  const coupon = await Coupon.findOne({ where: { code: code.toUpperCase().trim() } })

  
  if (!coupon) {
    return { valid: false, reason: 'INVALID_CODE', message:"Coupon is not valid" }
  }

  if (!coupon.isActive) {
    return { valid: false, reason: 'INACTIVE',message:"Coupon is not active" }
  }

  const now = new Date()
  if (coupon.startAt && now < coupon.startAt) {
    return { valid: false, reason: 'NOT_STARTED', message:"Coupon doesn't exist yet." }
  }
  if (coupon.endAt && now > coupon.endAt) {
    return { valid: false, reason: 'EXPIRED', message:"Coupon has expired" }
  }
  

  // Scope check
//   if (coupon.scope === 'KITCHEN') {
//     const isKitchenMatch = await coupon.hasKitchen(kitchenId) // sequelize auto-generated method
//     if (!isKitchenMatch) {
//       return { valid: false, reason: 'NOT_APPLICABLE_HERE' }
//     }
//   }
  if (coupon.scope === 'USER' && coupon.userId !== userId) {
    return { valid: false, reason: 'NOT_APPLICABLE_TO_USER', message: "You are not eligible for this coupon" }
  }
  // PROMOTER — treated like GLOBAL for v1, no extra check

  // First order check
  if (coupon.firstOrderOnly) {
    const pastOrderCount = await Order.count({ where: { userId} })
    if (pastOrderCount > 0) {
      return { valid: false, reason: 'FIRST_ORDER_ONLY', message:"This coupon is valid for first order only" }
    }
  }

  // Min order value — checked against whole cart subtotal
  if (cart.subtotal < coupon.minOrderValue) {
   
    return { valid: false, reason: 'MIN_ORDER_NOT_MET', minOrderValue: coupon.minOrderValue , message:`Minimum order value ${coupon.minOrderValue}`}
  }


  // Product/category restriction — filter eligible items
//   const eligibleItems = await filterEligibleItems(coupon, cart.items)
//   const eligibleSubtotal = eligibleItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

//   if (eligibleSubtotal === 0) {
//     return { valid: false, reason: 'NO_ELIGIBLE_ITEMS' }
//   }


  const eligibleSubtotal = cart.subtotal 

  // Usage limits
  if (coupon.usageLimitTotal) {
    const totalUsed = await CouponRedemption.count({
      where: { couponId: coupon.id, status: 'ACTIVE' },
    })
    if (totalUsed >= coupon.usageLimitTotal) {
      return { valid: false, reason: 'LIMIT_REACHED',message:"Coupon usage limit reached" }
    }
  }

if (coupon.usageLimitPerUser) {
  const userUsed = await CouponRedemption.count({
    where: { couponId: coupon.id, userId: userId, status: 'ACTIVE' },
  })
  if (userUsed >= coupon.usageLimitPerUser) {
    return { valid: false, reason: 'USER_LIMIT_REACHED',message:"Coupon usage limit reached" }
  }
}




if(coupon.discountType==='FREE_DELIVERY'){
  if(cart.deliveryFee===0){
    return{
      valid:false,
      reason: 'NO_FEE',
      message:'Delivery is already free.'
    }
  }
}


const discountAmount = calculateDiscountAmount(coupon, eligibleSubtotal, cart.deliveryFee)
console.log("discountAmount",discountAmount)
  return {
    valid: true,
    coupon,
    discountAmount,
    eligibleSubtotal,
  }
}

// async function filterEligibleItems(coupon, cartItems) {
//   const productLinks = await CouponProduct.findAll({ where: { couponId: coupon.id } })
//   const categoryLinks = await CouponCategory.findAll({ where: { couponId: coupon.id } })

//   if (productLinks.length === 0 && categoryLinks.length === 0) {
//     return cartItems // no restriction — whole cart eligible
//   }

//   const allowedProductIds = new Set(productLinks.map(p => p.productId))
//   const allowedCategoryIds = new Set(categoryLinks.map(c => c.categoryId))

//   return cartItems.filter(
//     item => allowedProductIds.has(item.productId) || allowedCategoryIds.has(item.categoryId)
//   )
// }

function calculateDiscountAmount(coupon, eligibleSubtotal, deliveryFee) {
  
  if (coupon.discountType === 'FREE_DELIVERY') {
    
    return deliveryFee
    // applied separately against deliveryFee, not subtotal
  }

  if (coupon.discountType === 'FLAT') {
    return Math.min(Number(coupon.discountValue), eligibleSubtotal)
  }

  // PERCENT
  let amount = eligibleSubtotal * (Number(coupon.discountValue) / 100)
  if (coupon.maxDiscountAmount) {
    amount = Math.min(amount, Number(coupon.maxDiscountAmount))
  }
  return amount
}

export const applyCouponService = async(code,userId,kitchenId)=>{

    // FIND THE CART
    const currCart = await getCartService2({userId})
    const result = await validateCoupon(code,userId,currCart,kitchenId)
    if(!result.valid){
      return result
    }    

     await Cart.update(
      {appliedCouponId:result.coupon.id},
      {where:{userId}}
     )   
  return result;
}


// REMOVE COUPON SERVICE
export const removeCouponService = async (userId) => {
  const currCart = await getCartService2({ userId })

  await Cart.update(
    { appliedCouponId: null },
    { where: { userId } }
  )

   return { success: true, message: 'Coupon removed successfully' }
}

export const applyCouponToCartSummary = async(userId, appliedCouponId, cartSummary, kitchenId)=>{
  let appliedCoupon = null
  let couponDiscount = 0
  // let deliveryFee = cartSummary.deliveryFee
  let baseDeliveryFee = cartSummary.deliveryFee
  let effectiveDeliveryFee = baseDeliveryFee

  if (!userId || !appliedCouponId) {
    return { appliedCoupon, couponDiscount, deliveryFee: effectiveDeliveryFee }
  }

  const coupon = await Coupon.findByPk(appliedCouponId)

  if (!coupon) {
    await Cart.update({ appliedCouponId: null }, { where: { userId } })
    return { appliedCoupon, couponDiscount, deliveryFee:effectiveDeliveryFee }
  }

  const result = await validateCoupon(coupon.code, userId, cartSummary, kitchenId)

  if (!result.valid) {
    await Cart.update({ appliedCouponId: null }, { where: { userId } })
    return { appliedCoupon, couponDiscount, deliveryFee: effectiveDeliveryFee }
  }

  couponDiscount = result.discountAmount

  // effectiveDeliveryFee = coupon.discountType === 'FREE_DELIVERY' ? 0 : baseDeliveryFee
  effectiveDeliveryFee = baseDeliveryFee




  appliedCoupon = { code: coupon.code, discountAmount: couponDiscount }

  return { appliedCoupon, couponDiscount, deliveryFee: effectiveDeliveryFee }
}


// GET ALL AVAILABLE COUOPONS

export const getAvailableCouponsService = async(userId)=>{
  const now= new Date()
  const coupons = await Coupon.findAll({
    where:{
      isActive:true,
      ishidden:{[Op.ne]: true,},

       scope: {
        [Op.ne]: "PROMOTER",
        [Op.ne]: "KITCHEN",
      },

      [Op.and]:[
        // check start date 
        {
          [Op.or]:[
            {startAt:null},
            {startAt:{[Op.lte]:now}}
          ]
        },
        // Coupon has not expired
        {
          [Op.or]: [
            { endAt: null },
            { endAt: { [Op.gte]: now } },
          ],
        },

           {
          [Op.or]: [
            // User-specific coupon
            {userId},

            // Public coupon
            {
              userId: null,
              scope: "GLOBAL",
            },
          ],
        },
      ]
    },
      attributes: [
      "id",
      "code",
      "description",
      "scope",
      "userId",
      "discountType",
      "discountValue",
      "maxDiscountAmount",
      "minOrderValue",
      "firstOrderOnly",
      "startAt",
      "endAt",
    ],
    order: [["createdAt", "DESC"]],
    raw:true
    
  })

  console.log("Available Coupons:", coupons)

  return{
    userCoupon : coupons.filter(coupon=> coupon.userId ===userId),
    availableCoupon : coupons.filter(coupon=>coupon.userId===null)
  }
}