import { where } from "sequelize";
import { BadRequestError, NotFoundError } from "../../../middleware/ErrorHandler.js";
import Cart from "../../../models/cart.js";
import CartItem from "../../../models/cartItems.js";
import Product from "../../../models/product.js";
import { calculateCartTotals } from "../../../utils/cartCalculator.js";
// HELPER
export const getOrCreateCart = async({userId,sessionId})=>{
    const where = userId ?{userId}:{sessionId};

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

  }

  const deletedItems= await CartItem.destroy({where:{cartId:guestCart.id}});

   console.log("Deleted guest cart items:", deletedItems);
  await guestCart.destroy();
  
}

