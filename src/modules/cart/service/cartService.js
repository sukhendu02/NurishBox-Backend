import { Op, where } from "sequelize";
import { BadRequestError, NotFoundError } from "../../../middleware/ErrorHandler.js";
import Cart from "../../../models/cart.js";
import CartItem from "../../../models/cartItems.js";
import Product from "../../../models/product.js";
import { calculateCartTotals } from "../../../utils/cartCalculator.js";
import KitchenInventory from "../../../models/kitchenInventory.js"
import Kitchen from "../../../models/kitchen.js"
import { calculateEta } from "../../../utils/distanceCalc.js";
import { DELIVERY_CONFIG } from "../../../Config/DeliveryConfig.js";
import { applyCouponToCartSummary } from "../../coupon/service/couponService.js";
// HELPER
export const getOrCreateCart = async({userId,sessionId})=>{
    const where = userId ?{userId}:{sessionId};
    console.log(where)
    let cart = await Cart.findOne({where});

    if(!cart) {
        cart = await Cart.create(
            userId
            ? {userId}
            :{sessionId}
        )
    }
    return cart;

}

// HELPER 
// ── Helper — get cart with all items ─────────────────────────────
export const getCartWithItems = async (cartId) => {
  return Cart.findByPk(cartId, {
    include: [{
      model:   CartItem,
      as:      "items",
      include: [{
        model:      Product,
        as:         "product",
        attributes: [
          "id", "name", "imageUrl",
          "basePrice", "discountPrice", "isAvailable",
        ],
      }],
    }],
  })
}
// GET CART

export const  getCartService = async ({userId,sessionId})=>{
  console.log("userId", userId) 
  console.log("sessionId", sessionId) 
  const where = userId?{userId} : {sessionId};

    console.log(where)
    const cart = await Cart.findOne({
        where,
       include: [{
      model:   CartItem,
      as:      "items",
      include: [{ model: Product, as: "product",
        attributes: ["id", "name", "imageUrl", "basePrice", "discountPrice", "isAvailable"],
      }],
    }],
    })


    // IF NO CART FOUNC 
    if(!cart || cart.items.length===0){
        return{
            items:[],
            itemCount:      0,
      subtotal:       0,
      totalSavings:   0,
      deliveryFee:    30,
      totalAmount:    0,
      freeDeliveryIn:DELIVERY_CONFIG.FREE_ORDER_AMOUNT,
        }

    }

    return calculateCartTotals(cart.items);
}

// NEW COMBINED 2
export const  getCartService2 = async ({userId,sessionId},selectedAddress)=>{
  
const kitchenId = selectedAddress?.kitchenId ?? null
  const where = userId?{userId} : {sessionId};
console.log(where)
    const cart = await Cart.findOne({
        where,
       include: [{
      model:   CartItem,
      as:      "items",
      include: [{ model: Product, as: "product",
        attributes: ["id", "name", "imageUrl", "basePrice", "discountPrice", "isAvailable"],
      }],
    }],
    })
    console.log(cart)


    // IF NO CART FOUNC 
    if(!cart || cart.items.length===0){
        return{
            items:[],
            itemCount:      0,
      subtotal:       0,
      totalSavings:   0,
      deliveryFee:    0,
      totalAmount:    0,
      freeDeliveryIn:DELIVERY_CONFIG.FREE_ORDER_AMOUNT,
      // new add
      unavailableItems : [],
      eta:             null,
      etaDistance:null,
      coupon:null,
        }

    }

    if (!kitchenId) {
  const cartSummary = calculateCartTotals(cart.items, 0);

  return {
    ...cartSummary,
unavailableItems: cart.items.map(item => item.product.id),
// unavailableItems: [],
    eta: null,
  };
}



     const etaData = await calculateEtaService2(kitchenId,selectedAddress);
     console.log("eta data",etaData.distanceKm,etaData.etaMinutes)


const { available, unavailable } = await checkItemAvailabilityService(
  kitchenId,
  cart.items.map(item => ({ productId: item.product.id, quantity: item.quantity }))
)

  const cartSummary= calculateCartTotals(cart.items,etaData.distanceKm);
    console.log("Cart Summary:", cartSummary);
   const kitchen = await Kitchen.findByPk(kitchenId)
  if(!kitchen){
    return{
       ...cartSummary,
       unavailableItems : unavailable.map(u => u.productId) ,
       eta:etaData.etaMinutes,
       etaDistance:etaData.distanceKm,
    }
  }

  // COUPON CODE CHECK
 const {appliedCoupon, couponDiscount, deliveryFee} = await applyCouponToCartSummary(userId,cart.appliedCouponId,cartSummary,kitchenId)


  return {
    ...cartSummary,
    eta: etaData.etaMinutes,
    etaDistance:etaData.distanceKm,
    unavailableItems : unavailable.map(u => u.productId),
   deliveryFee,
    totalAmount: cartSummary.subtotal + deliveryFee - couponDiscount,
    appliedCoupon,
    couponDiscount,
  };
       
}

export const addToCartService = async({userId,sessionId},productId,quantity=1)=>{

  console.log(userId,sessionId,productId,quantity);
    const product = await Product.findByPk(productId);
    if(!product) throw NotFoundError("Item not found")
    if(!product.isAvailable) throw BadRequestError("Item is currently not available")
        if(quantity<1 || quantity >20){
            throw BadRequestError("Quantity must be between 1 and 20");
        }

        const cart = await getOrCreateCart({userId,sessionId});
        const existingItem = await CartItem.findOne({
            where:{cartId:cart.id,
                productId,
            }
        })

        if(existingItem){
          // if quantity not given 
            const newQuantity = existingItem.quantity +quantity

            if(newQuantity>20) throw BadRequestError("Quantity Cannot be grater than 20");
             await existingItem.update({ quantity: newQuantity });
             } else {
    await CartItem.create({ cartId: cart.id, productId, quantity });
  }



    const updatedCart = await getCartWithItems(cart.id);
    console.log(updatedCart)
  return calculateCartTotals(updatedCart.items);
        
    }


export const updateCartItemsService = async({userId,sessionId},itemId,quantity)=>{
  if(quantity<1 || quantity>20){
    throw BadRequestError("Quantity must be between 1 to 20");
  }

  const where = userId ? {userId}:{sessionId};

  const cart = await Cart.findOne({where});

  if(!cart) throw NotFoundError("Cart");

  // console.log(cart)
  const item = await CartItem.findOne({
    where:{id:itemId,cartId:cart.id},
  })
  if(!item) throw NotFoundError("Cart item ");

  await item.update({quantity});

  const updateCart = await getCartWithItems(cart.id);
  return calculateCartTotals(updateCart.items);
}


// REMOVE ITEM FROM THE CART
export const removeItemfromCart = async ({userId,sessionId},itemId)=>{
  const where = userId? {userId}:{sessionId};

  console.log(userId,sessionId)
  const cart  = await Cart.findOne({where});

  if(!cart) throw NotFoundError("Cart");

  const item = await CartItem.findOne({
    where:{id:itemId,cartId:cart.id},
  });

  if(!item) throw NotFoundError("Cart item");

  await item.destroy();

  const updatedCart = await getCartWithItems(cart.id);

  return updatedCart.items.length>0
  ? calculateCartTotals(updatedCart.items)
  : {
    items:[],
    itemCount:0,
    subtotal:0,
    totalSavings:0,
    deliveryFee:0,
    totalAmount:0,
    freedeliveryIn:DELIVERY_CONFIG.FREE_ORDER_AMOUNT,
  }
}


// CLEAR FULL CART 
export const clearCartService = async({userId,sessionId})=>{
  const where = userId ?{userId} : {sessionId};
  const cart = await Cart.findOne({where});

  if(!cart) return{message:"Cart is already empty"}

  await CartItem.destroy({where:{cartId:cart.id}});
  return {
    message:"Cart cleared sucessfully"
  }
}


// MERGE GUEST CART INTO USER CART 
export const mergerCartService = async(userId,sessionId)=>{

  console.log("hiii I am from merge cart");
  console.log(userId,sessionId)
  if(!sessionId) return;
  const guestCart = await Cart.findOne({
    where:{sessionId},
    include:[{model:CartItem,as:"items"}]
  })
  

  if(!guestCart || guestCart.items.length===0) return;


  console.log("guestcart" ,guestCart);
  const userCart = await getOrCreateCart({userId});
console.log("userCart",userCart)
  for(const guestItem of guestCart.items){
    const existingItem = await CartItem.findOne({
      where: {cartId:userCart.id,productId:guestItem.productId},
    })

    if(existingItem){
      const newQty = Math.min(existingItem.quantity+guestItem.quantity,20);
      await existingItem.update({quantity:newQty});
    }
    else{
      await CartItem.create({
        cartId:userCart.id,
        productId:guestItem.productId,
        quantity:guestItem.quantity,
      });
    }

    console.log("userCart",userCart)

  }

  const deletedItems= await CartItem.destroy({where:{cartId:guestCart.id}});

   console.log("Deleted guest cart items:", deletedItems);
  await guestCart.destroy();
  return await getCartService({
  userId
})
}


export const checkItemAvailabilityService = async(kitchenId,items)=>{

      
     console.log("checkCartAvailability called");
  console.log(kitchenId,items)
      const productIds = items.map(i => i.productId)
  const inventory = await KitchenInventory.findAll({
      where: {
        kitchenId,
        productId: { [Op.in]: productIds },
      },
      attributes: ['productId', 'quantity', 'isAvailable'],
    })

      const inventoryMap = {}
    inventory.forEach(inv => {
      inventoryMap[inv.productId] = inv
    })

       const available   = []
    const unavailable = []

       items.forEach(({ productId, quantity }) => {
      const inv = inventoryMap[productId]
 
      if (!inv) {
        unavailable.push({ productId, reason: 'not_in_kitchen' })
      } else if (!inv.isAvailable) {
        unavailable.push({ productId, reason: 'not_available' })
      } else if (inv.quantity === 0) {
        unavailable.push({ productId, reason: 'out_of_stock' })
      } else {
        available.push({ productId, quantity, availableQty: inv.quantity })
      }
    })
    
    return{
      available,
      unavailable
    }
}

export const calculateEtaService = async(kitchenId,selectedAddress)=>{
  const KitchenLatLong = await Kitchen.findByPk(kitchenId,
    {
      attributes:['latitude','longitude']
    }
  );

  
  const EtaCalcualtion= calculateEta(KitchenLatLong.latitude,KitchenLatLong.longitude,selectedAddress.latitude,selectedAddress.longitude);
  return EtaCalcualtion.etaMinutes;
}
export const calculateEtaService2 = async(kitchenId,selectedAddress)=>{
  const KitchenLatLong = await Kitchen.findByPk(kitchenId,
    {
      attributes:['latitude','longitude']
    }
  );

  const {distanceKm,etaMinutes}= calculateEta(KitchenLatLong.latitude,KitchenLatLong.longitude,selectedAddress.latitude,selectedAddress.longitude);
  return {
    distanceKm,etaMinutes
  }

  
}

// GET CART ITEMS ONLY USING USER ID OR SESSION ID 
export const getCartItemsbyUserOrSession = async({userId,sessionId})=>{
  const where = userId ? {userId}:{sessionId};
  const cart = await Cart.findOne({
    where,
    include:[{
      model:CartItem,
      as:"items",
      include:[{
        model:Product,
        as:"product",
        attributes:["id","name","category","imageUrl","basePrice","discountPrice","isAvailable"]
      }]
    }]
  })


  return cart
}