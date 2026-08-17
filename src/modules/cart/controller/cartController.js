import { BadRequestError } from "../../../middleware/ErrorHandler.js";
import { calculateEta } from "../../../utils/distanceCalc.js";
import { getCartService,getCartService2,addToCartService, updateCartItemsService, removeItemfromCart, clearCartService, checkItemAvailabilityService,calculateEtaService } from "../service/cartService.js";
import Address from "../../../models/address.js"
const getIdentity = (req) => ({
  userId:    req.user?.id || null,
  sessionId: req.user ? null : req.sessionId,
});


export const getCart = async(req,res)=>{
    const result = await getCartService(getIdentity(req));

    res.json({
        success:true,
        data:result
    })
}

// NEW GET CART COMBINED 2
export const getCart2 = async(req,res)=>{
     const addressId = req.headers['x-address-id'] || null
     const hasLatLng = req.query.lat && req.query.lng && req.query.kitchenId
 
    
    let selectedAddress = null  // ← declare here

    if (req.user?.id) {
      if (addressId) {
        selectedAddress = await Address.findOne({
          where:      { id: addressId, userId: req.user.id },
          attributes: ['id', 'kitchenId', 'latitude', 'longitude'],
        })
      } else if (hasLatLng) {
        selectedAddress = {
          kitchenId: req.query.kitchenId,
          latitude:  parseFloat(req.query.lat),
          longitude: parseFloat(req.query.lng),
          isVirtual: true,
        }
      } else {
        selectedAddress = await Address.findOne({
          where:      { userId: req.user.id, isDefault: true },
          attributes: ['id', 'kitchenId', 'latitude', 'longitude'],
        })
      }
    } else {
      if (hasLatLng) {
        selectedAddress = {
          kitchenId: req.query.kitchenId,
          latitude:  parseFloat(req.query.lat),
          longitude: parseFloat(req.query.lng),
          isVirtual: true,
        }
      }
    }
    
    //  const kitchenId = req.query.kitchenId
    const result = await getCartService2(getIdentity(req),selectedAddress);
    console.log("result", result)
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
    console.log(kitchenId,selectedAddress)
    // console.log("get selected aDdress", selectedAddress)
    if(!kitchenId){
        return res.status(200).json({
        success:     true,
        available:   [],
        unavailable: items.map(i => ({ productId: i.productId, reason: 'no_kitchen' })),
      })
    }

    // console.log("this is the body",req.body)

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