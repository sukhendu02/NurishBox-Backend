
import { NotFoundError } from "../../../middleware/ErrorHandler.js";
import { verifyAccessToken } from "../../../utils/token.js";
import { User } from "../../auth/Models/user.js";
import {payandplaceOrderService,getOrderDetailsService,trackOrderService,verifyOrderOwnership,isTerminal} from "../Service/orderService.js"

export const placeOrder = async(req,res)=>{

    const {addressId,specialInstr} = req.body || null;
    const userId =req.user.id;   
    const idempotencyKey=  req.headers["x-idempotency-key"]
    const paymentMethod=req.body.paymentMethod
    const specialInstructions = req.body.specialInstructions || null;
    
    const order = await payandplaceOrderService(userId,{addressId,idempotencyKey,paymentMethod,specialInstructions});
    res.status(201).json({
        success:true,
        data:order
    })
}

export const getOrderDetails = async(req,res)=>{
    const {orderId} = req.params
    const userId = req.user.id

    console.log(orderId,userId)
   
    const ord = await getOrderDetailsService(userId,{orderId})
    res.status(200).json({
        success:true,
        data:ord
    })
}

// export const trackOrder = async(req,res)=>{
//     const orderId= req.params.orderId;
//     const userId = req.user.id;


// try {
    

//      const order = await verifyOrderOwnership(orderId, userId)
//    console.log(order)
//      if(!order) throw NotFoundError("Order")

//          // SSE headers
//     res.setHeader('Content-Type', 'text/event-stream')
//     res.setHeader('Cache-Control', 'no-cache')
//     res.setHeader('Connection', 'keep-alive')
//     res.setHeader('X-Accel-Buffering', 'no')
//     res.flushHeaders()

//     // Push initial status
//     sendEvent(res, 'order_update', {
//       orderId,
//       status: order.status,
//       isFinal: isTerminal(order.status),
//     })

//     if (isTerminal(order.status)) {
//       return res.end()
//     }
//   // Start polling
//     const stopPolling = pollOrderStatus(
//       orderId,
//       userId,
//       (update) => {
//         sendEvent(res, 'order_update', update)
//         if (update.isFinal) res.end()
//       },
//       (err) => {
//         console.error('SSE polling error:', err)
//         res.end()
//       }
//     )

//     // Client disconnected
//     req.on('close', stopPolling)

//     } catch (error) {
//  console.log(error)   
// }
// }

function sendEvent(res, event, data) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

export const trackOrder = async (req, res) => {

    
  const orderId = req.params.orderId  

   // ── Auth ──
  const token = req.query.token
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' })

  let userId
  try {
    const decoded = verifyAccessToken(token)
    const user = await User.findByPk(decoded.id)
    if (!user) return res.status(401).json({ success: false, message: 'User not found' })
    userId = user.id
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }

  
  console.log("orderId:", orderId, "userId ",userId)

  try {
    const order = await verifyOrderOwnership(orderId, userId)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
console.log(order)
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    sendEvent(res, 'order_update', {
      orderId,
      status: order.status,
      isFinal: isTerminal(order.status),
    })

    if (isTerminal(order.status)) return res.end()

    const stopPolling = await trackOrderService(  // ✅ fix 2
      userId,
      orderId,
      (update) => {
        sendEvent(res, 'order_update', update)
        if (update.isFinal) res.end()
      },
      (err) => {
        console.error('SSE polling error:', err)
        res.end()
      }
    )

    req.on('close', stopPolling)


    
  } catch (err) {
    console.error('trackOrder error:', err)
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Internal server error' })
    } else {
      res.end()
    }
  }
}



