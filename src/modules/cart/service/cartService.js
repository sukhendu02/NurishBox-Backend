import { Op, where } from "sequelize";
import { BadRequestError, NotFoundError } from "../../../middleware/ErrorHandler.js";
import Cart from "../../../models/cart.js";
import CartItem from "../../../models/cartItems.js";
import Product from "../../../models/product.js";
import { calculateCartTotals } from "../../../utils/cartCalculator.js";
import KitchenInventory from "../../../models/kitchenInventory.js"
import Kitchen from "../../../models/kitchen.js"
import { calculateEta } from "../../../utils/distanceCalc.js";
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
const getCartWithItems = async (cartId) => {
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
    //   freeDeliveryIn: 399,
        }

    }

    return calculateCartTotals(cart.items);
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
    freedeliveryIn:199,
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