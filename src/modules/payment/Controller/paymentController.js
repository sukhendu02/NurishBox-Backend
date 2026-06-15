
import { createPaymentOrderService,verifyPaymentService,handleWebhookService } from "../Service/paymentService.js"


export const createPaymentOrder = async (req,res)=>{
const {orderId} = req.params
const data = await createPaymentOrderService(req.user.id,orderId)
res.json({ 
    success:true,
    message:"Razorpay order created",
    data,
})
}
export const verifyPayment = async (req,res)=>{
const {orderId,razorpayOrderId, razorpayPaymentId, razorpaySignature}= req.body
    const order = await verifyPaymentService(req.user.id,{orderId,razorpayOrderId,razorpayPaymentId,razorpaySignature});
    res.json({
        success:true,
        message:'Pament verified successfully',
        data:order
    })
}

export const razorpayWebhook = async(req,res)=>{

    const signature = req.headers['x-razorpay-signature']
    const rawBody = req.body
    console.log(rawBody)
    if(!signature){
        return res.status(400).json({
            success:false,
            message:"Missing Signature"
        })
    }

    const result = await handleWebhookService(rawBody,signature)
    res.status(200).json(result)

}

// GET PAYMENT DETAIL

// export const getPaymentDetail = async (req, res) => {
//   const payment = await PaymentService.getPaymentDetailService(
//     req.user.id,
//     req.params.orderId
//   )
 
//   res.json({
//     success: true,
//     data:    payment,
//   })
// }