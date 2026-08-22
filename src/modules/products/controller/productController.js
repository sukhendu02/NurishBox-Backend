
import {getallItemsService,getSuggestedItemsService } from "../service/productService.js"
import Address from "../../../models/address.js";
import { getCartItemsbyUserOrSession } from "../../cart/service/cartService.js";
import {getIdentity} from "../../cart/controller/cartController.js"
export const getAllItems = async(req,res)=>{
    let kitchenId = null;
    let latitude = req.query.lat || null;
    let longitude = req.query.lng || null
    

       

   if (req.user?.id) {
      // Read selected addressId from header — sent by frontend top bar
      const addressId = req.headers['x-address-id'] || null
      const address = addressId
      
        // Use selected address — userId guard prevents accessing others' addresses
        ? await Address.findOne({
            where:      { id: addressId, userId: req.user.id },
            attributes: ['kitchenId', 'latitude', 'longitude'],
          })
        // Fallback to default address if no header sent
        : await Address.findOne({
            where:      { userId: req.user.id, isDefault: true },
            attributes: ['kitchenId', 'latitude', 'longitude'],
          })
 
         
      if (address) {
        kitchenId = address.kitchenId || null
        latitude  = address.latitude  || latitude
        longitude = address.longitude || longitude
      }
     

    }


 

    const response = await getallItemsService(req.query,{kitchenId,latitude,longitude});
    console.log("This is the response that ",response)   
    res.status(200).json({
        success: true,
        ...response,
      });
}


export const getSuggestedItems = async(req,res)=>{
   let kitchenId = null

  if (req.user?.id) {
    const userId = req.user.id;
    const addressId = req.headers['x-address-id'] || null
    const address = addressId
      ? await Address.findOne({
          where: { id: addressId, userId: req.user.id },
          attributes: ['kitchenId'],
        })
      : await Address.findOne({
          where: { userId: req.user.id, isDefault: true },
          attributes: ['kitchenId'],
        })

    if (address) {
      kitchenId = address.kitchenId || null
    }
  }


 
  const cartItems =  await getCartItemsbyUserOrSession(getIdentity(req))
  const suggestedItems = await getSuggestedItemsService(kitchenId,cartItems.items);
console.log(suggestedItems)
  res.status(200).json({
    success: true, 
    suggestedItems
  }
)}