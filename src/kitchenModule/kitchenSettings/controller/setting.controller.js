import { BadRequestError } from "../../../middleware/ErrorHandler.js"
import {getKitchenSettingsService,updateAcceptingOrdersService,getKitchenSecurityInfoService,updateKitchenBasicSettingsService} from "../service/setting.service.js"


export const getKitchenSettings = async (req, res) => {

    const { kitchenId } = req.kitchenAuth
    if(!kitchenId){
        throw BadRequestError("Kitchen Id is missing ")
    }
    const settings = await getKitchenSettingsService(kitchenId)

    res.status(200).json({
        success: true,
        settings,
    })
}

export const updateAcceptingOrders = async (req, res) => {

    const { kitchenId } = req.kitchenAuth
    const { acceptingOrders } = req.body

    if(!kitchenId){
        throw BadRequestError("Missing required Details")
    }
    const result = await updateAcceptingOrdersService(kitchenId, acceptingOrders)

    res.status(200).json({
        success: true,
        ...result,
    })
}

export const getKitchenSecurityInfo = async (req, res) => {
 
    const { kitchenUserId } = req.kitchenAuth
    const { historyLimit } = req.query
 
    const result = await getKitchenSecurityInfoService(kitchenUserId, { historyLimit })
 
    res.status(200).json({
        success: true,
        ...result,
    })
}

export const updateKitchenBasicSettings = async (req, res) => {
 
    const { kitchenId } = req.kitchenAuth
 
    const result = await updateKitchenBasicSettingsService(kitchenId, req.body)
 
    res.status(200).json({
        success: true,
        ...result,
    })
}