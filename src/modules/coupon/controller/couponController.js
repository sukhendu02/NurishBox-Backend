import { response } from "express"
import { applyCouponService,removeCouponService,getAvailableCouponsService } from "../service/couponService.js";
import { BadRequestError } from "../../../middleware/ErrorHandler.js";

// APPLY THE COUPON CODE
export const applyCoupon = async(req,res)=>{
    const {code}=req.body;
    if(!code){
        throw BadRequestError("Please enter coupon.")
    }
    // console.log(code)
    const userId = req.user.id

    
    const kitchenId = req.body.kitchenId
   
    const response = await applyCouponService(code,userId,kitchenId)
    res.status(200).json({
        success:true,
        response
    })
}

export const removeCoupon = async(req,res)=>{
    const userId = req.user.id
    const response = await removeCouponService(userId)
    res.status(200).json({
        success:true,
        response
    })
}


export const getAvailableCoupons = async(req,res)=>{
    const userId = req.user.id
    const data = await getAvailableCouponsService(userId);
    console.log(data)
    res.status(200).json({
        success:true,
        data
    })
}