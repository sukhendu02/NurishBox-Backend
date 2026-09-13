import { BadRequestError } from "../../../middleware/ErrorHandler.js"
import KitchenUser from "../../../models/kitchenUser.js"

import { kitchenLoginService, kitchenRefreshService,kitchenLogoutService ,getKitchenProfileService} from "../service/auth.service.js"

export const kitchenLogin = async(req , res)=>{

    const { kitchenCode, password, deviceId, deviceLabel, confirmKick } = req.body
   console.log(req.body)
    const ipAddress = req.ip
    const location = req.geoLocation || null 

    if (!kitchenCode || !password ) {
       throw BadRequestError('Please fill all the required details')
    }
    const result = await kitchenLoginService(
        kitchenCode,
        password,
        deviceId,
        deviceLabel,
        confirmKick,
        ipAddress,
        location,
        req.app.get('io')
    )

  console.log(result)

    res.status(200).json({
        success: true,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        kitchen: result.kitchen,

        result
    })
}

 
export const kitchenRefresh = async (req, res) => {
 
    const { refreshToken } = req.body
 
    if (!refreshToken) {
       throw BadRequestError('refreshToken is required')
    }
 
    const result = await kitchenRefreshService(refreshToken)
 
    res.status(200).json({
        success: true,
        accessToken: result.accessToken,
        kitchen: result.kitchen,

        result
    })
}


// LOGOUT
export const kitchenLogout = async (req, res) => {
 
    const { kitchenUserId } = req.kitchenAuth
 
    const result = await kitchenLogoutService(kitchenUserId)
 
    res.status(200).json({
        success: true,
        ...result,
    })
}

export const kitchenRegister = async(req , res)=>{

    const {kitchen_id,password,recovery_contact_email,recovery_contact_phone,is_active} = req.body;

    if(!kitchen_id || password || is_active ){
        throw BadRequestError("Missing required Details")
    }
    const newKitchenUser = await kitchenRegisterService(req.body);
    res.status(201).json({
        success:true,
        newKitchenUser
    })
    
}



export const getKitchenProfile = async (req, res) => {
 
    const { kitchenUserId } = req.kitchenAuth
 
    const profile = await getKitchenProfileService(kitchenUserId)
 
    res.status(200).json({
        success: true,
        profile,
    })
}