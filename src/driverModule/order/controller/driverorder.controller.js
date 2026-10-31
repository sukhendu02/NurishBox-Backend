import { listAvailableOrdersService,acceptOrderService,orderDetailsDriverService,orderPickupService ,deliverOrderService,getDriverStatsService,listHistoryService,getCashSummaryService} from "../service/driverorder.service.js"


export const listAvailableOrders = async (req,res) =>{
    const { lat, lng, sort } = req.query
    const result = await listAvailableOrdersService(req.driver, { lat, lng, sort })
    return res.status(200).json({
        success:true,
        ...result
    })
}


export const acceptOrder = async (req, res) => {

      const result = await acceptOrderService(req.driver.id, req.params.id)
      res.status(200).json({ 
        success: true,
         ...result
         })
    
  }
export const orderDetailsDriver = async (req, res) => {

      const order = await orderDetailsDriverService(req.driver.id, req.params.id)
      res.status(200).json({ 
        success: true,
         order
         })
    
  }
export const orderPickup = async (req, res) => {
    const result = await orderPickupService(req.driver.id, req.params.id, { lat: req.body?.lat, lng: req.body?.lng })
    res.status(200).json({ 
    success: true,
        ...result
        })
    
  }
export const deliverOrder = async (req, res) => {
  const { collectedAmount } = req.body
    const result = await deliverOrderService(req.driver.id, req.params.id, { lat:req.body?.lat, lng:req.body?.lng, collectedAmount })
    res.status(200).json({ 
    success: true,
        ...result
        })
    
  }


  // GET /driver/v1/stats
export const getDriverStats = async (req, res) => {
  
    const stats = await getDriverStatsService(req.driver.id)
    res.status(200).json({ success: true, ...stats })
 
}
 
// GET /driver/v1/orders/history?from=2026-10-01&to=2026-10-14&status=DELIVERED&page=1&limit=20
export const getDriverOrderHistory = async (req, res) => {

    const result = await listHistoryService(req.driver.id, req.query)
    res.status(200).json({ success: true, ...result })
 
}


// GET /cash/summary
export const getCashSummary = async (req, res) => {

    const summary = await getCashSummaryService(req.driver.id)
    res.status(200).json({ success: true, ...summary })
 
}



