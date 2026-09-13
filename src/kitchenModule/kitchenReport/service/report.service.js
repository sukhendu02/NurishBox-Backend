import { Op } from 'sequelize'
import Order from '../../../models/order.js'
import Product from '../../../models/product.js'
import KitchenInventory from '../../../models/kitchenInventory.js'

const formatHourLabel = (hour) => {
    const period = hour < 12 ? 'AM' : 'PM'
    const displayHour = hour % 12 === 0 ? 12 : hour % 12
    return `${displayHour} ${period}`
}

export const getKitchenHourlyTrendService = async (kitchenId, { date } = {}) => {

    const targetDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const orders = await Order.findAll({
        where: {
            kitchenId,
            createdAt: { [Op.between]: [startOfDay, endOfDay] },
        },
        attributes: ['id', 'createdAt'],
    })

    const hourBuckets = {}
    for (const order of orders) {
        const hour = new Date(order.createdAt).getHours()
        hourBuckets[hour] = (hourBuckets[hour] || 0) + 1
    }

    // Always return all 24 hours, even ones with zero orders — keeps the
    // chart's x-axis consistent rather than only showing hours with activity.
    return Array.from({ length: 24 }, (_, hour) => ({
        hour: formatHourLabel(hour),
        value: hourBuckets[hour] || 0,
    }))
}


export const getKitchenDashboardStatsService = async (kitchenId, { date } = {}) => {
 
    const targetDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)
 
    const orders = await Order.findAll({
        where: {
            kitchenId,
            createdAt: { [Op.between]: [startOfDay, endOfDay] },
        },
        attributes: ['id', 'status', 'totalAmt'],
    })
 
    const todaysOrders = orders.length
    const preparing = orders.filter((o) => o.status === 'PREPARING').length
 
    // "Ready" has no dedicated status in our schema — OUT_FOR_DELIVERY is the
    // closest equivalent to "packed and ready to go", per the earlier decision
    // that kitchen marks this status when the order is ready/dispatched.
    const ready = orders.filter((o) => o.status === 'PREPARED').length
 
    const delivered = orders.filter((o) => o.status === 'DELIVERED').length
    const cancelled = orders.filter((o) => o.status === 'CANCELLED').length
 
    // Revenue counted only from DELIVERED orders — cancelled/refunded excluded,
    // and in-progress orders not counted as realized revenue yet.
    const revenue = orders
        .filter((o) => o.status === 'DELIVERED')
        .reduce((sum, o) => sum + Number(o.totalAmt), 0)
 
    const acceptanceRate = todaysOrders > 0
        ? Math.round(((todaysOrders - cancelled) / todaysOrders) * 100)
        : 100
 
    return {
        todaysOrders,
        revenue: Number(revenue.toFixed(2)),
        preparing,
        ready,
        delivered,
        cancelled,
        acceptanceRate,
    }
}

const DEFAULT_LOW_STOCK_THRESHOLD = 5
 
export const getKitchenProductStatsService = async (kitchenId, { lowStockThreshold } = {}) => {
 
    const threshold = Number(lowStockThreshold) || DEFAULT_LOW_STOCK_THRESHOLD
 
    const totalProducts = await Product.count({
        where: { discontinued: false },
    })
 
    const totalImported = await KitchenInventory.count({
        where: { kitchenId },
    })
 
    // Low stock: some stock left, but at or below the threshold — distinct
    // from "no stock" (quantity 0), which is its own separate bucket below.
    const lowStock = await KitchenInventory.count({
        where: {
            kitchenId,
            quantity: { [Op.gt]: 0, [Op.lte]: threshold },
        },
    })
 
    const noStock = await KitchenInventory.count({
        where: { kitchenId, quantity: 0 },
    })
 
    return {
        totalProducts,
        totalImported,
        lowStock,
        noStock,
        lowStockThreshold: threshold,
    }
}