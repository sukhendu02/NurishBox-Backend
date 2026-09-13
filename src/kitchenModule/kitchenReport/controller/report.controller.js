import { BadRequestError } from "../../../middleware/ErrorHandler.js"
import { getKitchenHourlyTrendService,getKitchenDashboardStatsService,getKitchenProductStatsService } from "../service/report.service.js"
export const getKitchenDashboardStats = async (req, res) => {
 
    const { kitchenId } = req.kitchenAuth
    const { date } = req.query
    
    if(!kitchenId){
        throw BadRequestError("Kitchen is missing")
    }
    const stats = await getKitchenDashboardStatsService(kitchenId, { date })
 
    res.status(200).json({
        success: true,
        stats,
    })
}

export const getKitchenHourlyTrend = async (req, res) => {
 
    const { kitchenId } = req.kitchenAuth
    const { date } = req.query
    if(!kitchenId){
        throw BadRequestError("Kitchen is missing")
    }
    const hourlyData = await getKitchenHourlyTrendService(kitchenId, { date })
 
    res.status(200).json({
        success: true,
        hourlyData,
    })
}


// PRODUCT STATS
export const getKitchenProductStats = async (req, res) => {
 
    const { kitchenId } = req.kitchenAuth
    const { lowStockThreshold } = req.query
 
    const stats = await getKitchenProductStatsService(kitchenId, { lowStockThreshold })
 
    res.status(200).json({
        success: true,
        stats,
    })
}