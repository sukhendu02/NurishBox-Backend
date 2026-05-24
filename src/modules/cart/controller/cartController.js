import { BadRequestError } from "../../../middleware/ErrorHandler.js";
import { getCartService,addToCartService, updateCartItemsService, removeItemfromCart, clearCartService } from "../service/cartService.js";

const getIdentity = (req) => ({
  userId:    req.user?.id || null,
  sessionId: req.user ? null : req.sessionId,
});


export const getCart = async(req,res)=>{
   console.log(req.user)
    const result = await getCartService(getIdentity(req));
    res.json({
        success:true,
        data:result
    })
}

export const addToCart = async(req,res)=>{
    const {productId,quantity} = req.body;
    if(!productId ){
        throw BadRequestError("Invalid product Id")
    }

    const resp = await addToCartService(getIdentity(req),productId,quantity)

    res.json({
        success:true,
        data:resp,
    })
}

export const updateCartItem = async(req,res)=>{
    const {quantity} = req.body;
    const {itemId} = req.params;
    const result = await updateCartItemsService(getIdentity(req),itemId,quantity)
    res.json({
        success:true,
        data:result
    })
}


export const removeItem = async(req,res)=>{
    const {itemId} = req.params;
 
    const result = await removeItemfromCart(getIdentity(req),itemId)
    res.json({
        success:true,
        data:result
    })
}

export const clearCart = async(req,res)=>{
    
    const result = await clearCartService(getIdentity(req));
    res.json({
        success:true,
        data:result
    })
}