import { BadRequestError } from "../../../middleware/ErrorHandler.js"
import { getKitchenOrdersService,getKitchenOrderDetailService,updateKitchenOrderStatusService, cancelKitchenOrderService,getAllKitchenOrdersService } from "../service/order.service.js"
export const getKitchenOrders = async(req, res)=>{
    const { kitchenId } = req.kitchenAuth
    const { status, page, limit } = req.query
 
    const result = await getKitchenOrdersService(kitchenId, { status, page, limit })
 
    res.status(200).json({
        success: true,
        ...result,
    })
}

export const getKitchenOrderDetail = async (req, res) => {
 
    const { kitchenId } = req.kitchenAuth
    const { id } = req.params
 
    const order = await getKitchenOrderDetailService(kitchenId, id)
 
    res.status(200).json({
        success: true,
        order,
    })
}

export const updateKitchenOrderStatus = async(req,res)=>{
    const { kitchenId } = req.kitchenAuth
    const { id } = req.params
    const { status } = req.body
 
    if (!status) {
        throw BadRequestError('status is required')
    }
 
    const order = await updateKitchenOrderStatusService(kitchenId, id, status)
 
    res.status(200).json({
        success: true,
        order,
    })
}


export const cancelKitchenOrder = async (req, res) => {
 
    const { kitchenId } = req.kitchenAuth
    const { id } = req.params
    const { cancelReason } = req.body
 
    const order = await cancelKitchenOrderService(kitchenId, id, cancelReason)
 
    res.status(200).json({
        success: true,
        order,
    })
}


export const getALLKitchenOrders=async(req,res)=>{
    const { kitchenId } = req.kitchenAuth
    const { status, paymentMethod, search, sortBy, sortDir, startDate, endDate, page, limit } = req.query
 
    const result = await getAllKitchenOrdersService(kitchenId, {
        status, paymentMethod, search, sortBy, sortDir, startDate, endDate, page, limit,
    })
 
    res.status(200).json({
        success: true,
        ...result,
    })
}