import { BadRequestError } from "../../../middleware/ErrorHandler.js"
import {getKitchenCatalogService, importProductsToKitchenService,getKitchenInventoryListService,updateInventoryAvailabilityService,updateInventoryQuantityService} from "../service/catalog.service.js"


export const getKitchenCatalog=async(req ,res)=>{
    const { kitchenId } = req.kitchenAuth
    const { category, search, page, limit } = req.query
    const result = await getKitchenCatalogService(kitchenId, { category, search, page, limit })
    res.status(200).json({
        success: true,
        ...result,
    })
}


export const importKitchenproduct=async(req ,res)=>{
    
    const { kitchenId } = req.kitchenAuth
    const { productIds } = req.body

    if(!productIds){
        throw BadRequestError("Product is missing")
    }
    const result = await importProductsToKitchenService(kitchenId,productIds)
    res.status(200).json({
        success: true,
        ...result,
    })
}

export const importedKitchenproduct = async (req, res) => {
 
    const { kitchenId } = req.kitchenAuth
    const { category, status, search, sort, page, limit } = req.query
 
    const result = await getKitchenInventoryListService(kitchenId, { category, status, search, sort, page, limit })
 
    res.status(200).json({
        success: true,
        ...result,
    })
}

export const updateInventoryAvailability=async(req ,res)=>{
    const { kitchenId } = req.kitchenAuth
    const { id } = req.params
    const { isAvailable } = req.body
    console.log(id,kitchenId,isAvailable)
 
    if (typeof isAvailable !== 'boolean') {
        BadRequestError('isAvailable must be true or false')
    }
 
    const item = await updateInventoryAvailabilityService(kitchenId, id, isAvailable)
 
    res.status(200).json({
        success: true,
        item,
    })
}
export const updateInventoryQuantity=async(req ,res)=>{
    const { kitchenId } = req.kitchenAuth
    const { id } = req.params
    const { quantity } = req.body
 
    console.log(kitchenId,id,quantity)
    const item = await updateInventoryQuantityService(kitchenId, id, Number(quantity))
 
    res.status(200).json({
        success: true,
        item,
    })
}