
import {payandplaceOrderService} from "../Service/orderService.js"

export const placeOrder = async(req,res)=>{

    const {addressId,specialInstr} = req.body || null;
    const userId =req.user.id;   
    const idempotencyKey=  req.headers["x-idempotency-key"]
    const paymentMethod=req.body.paymentMethod
    
    const order = await payandplaceOrderService(userId,{addressId,specialInstr,idempotencyKey,paymentMethod});
    res.status(201).json({
        success:true,
        data:order
    })
}

