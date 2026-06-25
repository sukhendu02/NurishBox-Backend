import { BadRequestError } from "../../../middleware/ErrorHandler.js";
import { calculateEta } from "../../../utils/distanceCalc.js";
import { getCartService,addToCartService, updateCartItemsService, removeItemfromCart, clearCartService, checkItemAvailabilityService,calculateEtaService } from "../service/cartService.js";

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

// CONTROLLER FOR CHECK ITEM AVAILIABLITY
export const checkItemAvailability = async(req,res)=>{

    const {kitchenId,items,selectedAddress} = req.body;
  
    console.log("get selected aDdress", selectedAddress)
    if(!kitchenId){
        return res.status(200).json({
        success:     true,
        available:   [],
        unavailable: items.map(i => ({ productId: i.productId, reason: 'no_kitchen' })),
      })
    }

    const {available,unavailable} = await checkItemAvailabilityService(kitchenId,items);
    const eta = await calculateEtaService(kitchenId,selectedAddress)
    
    console.log(eta)
    return res.status(200).json({
        success:true,
        available,
        unavailable,
        eta
    })    
}