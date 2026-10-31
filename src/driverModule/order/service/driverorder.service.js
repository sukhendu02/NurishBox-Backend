import { col, fn, literal, Op, QueryTypes } from "sequelize"
import dotenv from "dotenv";
dotenv.config();
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../../middleware/ErrorHandler.js"
import Delivery from "../../../models/delivery.js"
import DriverKitchen from "../../../models/driverKitchen.js"
import DeliveryStatusLog from "../../../models/deliveryStatusLog.js"
import Order from "../../../models/order.js"
import Kitchen from "../../../models/kitchen.js"
import Address from "../../../models/address.js"
import Payment from "../../../models/payment.js"
import OrderItem from "../../../models/orderItem.js"
import { resolvePaymentMode } from "../../../utils/resolvePaymentMode.js"
import { harversineDistance } from "../../../utils/distanceCalc.js"
import Driver from "../../../models/driver.js"
import { sequelize } from "../../../Config/database.js"
import { parse } from "node:path"
import { DAY_MS, getStatsRanges, parseIstDay } from "../../../utils/driver/isoDates.js";
const MAX_ACTIVE_DELIVERIES = 3
const LIST_LIMIT = 50
const DEAD_ORDER_STATUSES = ['CANCELLED', 'REFUNDED', 'DELIVERED']
export const LIVE_DELIVERY_STATES = ['ASSIGNED', 'PICKED_UP']
// export const DEAD_ORDER_STATUSES = ['CANCELLED', 'REFUNDED']

export const OPEN_ORDER_STATUSES = ['CONFIRMED', 'PREPARING', 'PREPARED'] 


// true  = driver may only pick up after the kitchen marks the order PREPARED
// false = driver may also pick up while it is still PREPARING
const REQUIRE_PREPARED = (process.env.DRIVER_REQUIRE_PREPARED ?? 'true') !== 'false'


// OUT_FOR_DELIVERY is allowed so a retry (or a kitchen that already moved it) never blocks the driver
export const canPickupOrderStatus = (status) =>
  (REQUIRE_PREPARED ? ['PREPARED', 'OUT_FOR_DELIVERY'] : ['PREPARING', 'PREPARED', 'OUT_FOR_DELIVERY']).includes(status)

const WINDOW_HOURS = Number(process.env.AVAILABLE_WINDOW_HOURS || 12000)
const CACHE_TTL_MS = Number(process.env.AVAILABLE_CACHE_TTL_MS || 3000)

// Orders that no driver has taken yet
const NOT_TAKEN = literal('NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.order_id = "Order"."id")')

// ── per-kitchen cache: one DB load per kitchen per few seconds, shared by all its drivers ──
const cache = new Map() // kitchenId -> { at, data }
const inflight = new Map() // kitchenId -> Promise (so parallel requests share one load)

export const invalidateKitchenOpenOrders = (kitchenId) => cache.delete(kitchenId)

async function getKitchenOpenOrders(kitchenId) {
    const hit = cache.get(kitchenId)
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data
    if (inflight.has(kitchenId)) return inflight.get(kitchenId)
  
    const p = loadKitchenOpenOrders(kitchenId)
      .then((data) => {
        cache.set(kitchenId, { at: Date.now(), data })
        return data
      })
      .finally(() => inflight.delete(kitchenId))
    inflight.set(kitchenId, p)
    return p
  }

  async function loadKitchenOpenOrders(kitchenId) {
    console.log(kitchenId)
    const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000)
    const orders = await Order.findAll({
      where: { kitchenId, status: { [Op.in]: OPEN_ORDER_STATUSES }, createdAt: { [Op.gte]: since }, [Op.and]: [NOT_TAKEN] },
      attributes: ['id', 'orderNumber', 'status', 'createdAt', 'addressId', 'totalAmt'],
      order: [['createdAt', 'ASC']],
      limit: LIST_LIMIT,
      raw: true,
    })
   
    if (!orders.length) return []
  
    const orderIds = orders.map((o) => o.id)
    const [kitchen, addresses, payments, itemCounts] = await Promise.all([
      Kitchen.findByPk(kitchenId, { attributes: ['id', 'name', 'line1', 'city', 'latitude', 'longitude'], raw: true }),
      Address.findAll({ where: { id: { [Op.in]: orders.map((o) => o.addressId) } }, attributes: ['id', 'city', 'pincode', 'latitude', 'longitude'], raw: true }),
      Payment.findAll({ where: { orderId: { [Op.in]: orderIds } }, raw: true }),
      OrderItem.findAll({ where: { orderId: { [Op.in]: orderIds } }, attributes: ['orderId', [fn('COUNT', col('id')), 'cnt']], group: ['orderId'], raw: true }),
    ])
    const addrById = Object.fromEntries(addresses.map((a) => [a.id, a]))
    const payByOrder = Object.fromEntries(payments.map((p) => [p.orderId, p]))
    const itemsByOrder = Object.fromEntries(itemCounts.map((c) => [c.orderId, Number(c.cnt)]))
  
    const kitchenCard = {
      id: kitchen.id,
      name: kitchen.name,
      address: [kitchen.line1, kitchen.city].filter(Boolean).join(', '),
      lat: Number(kitchen.latitude),
      lng: Number(kitchen.longitude),
    }
  
    return orders.map((o) => {
      const a = addrById[o.addressId]
      const { paymentMode, codAmount } = resolvePaymentMode(payByOrder[o.id], o)
      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        kitchen: kitchenCard,
        // Full address and customer phone are shown only after the driver accepts
        dropArea: [a?.city, a?.pincode].filter(Boolean).join(' '),
        dropLat: a?.latitude == null ? null : Number(a.latitude),
        dropLng: a?.longitude == null ? null : Number(a.longitude),
        distanceKm: harversineDistance(kitchen.latitude, kitchen.longitude, a?.latitude, a?.longitude),
        paymentMode,
        codAmount,
        kitchenStatus: o.status,
        itemsCount: itemsByOrder[o.id] || 0,
        createdAt: o.createdAt,
      }
    })
}
const parseCoord = (v, name, min, max) => {
    if (v === undefined || v === null || v === '') return null
    const n = Number(v)
    if (Number.isNaN(n) || n < min || n > max) throw BadRequestError(`${name} is invalid`)
    return n
  }

  export const listAvailableOrdersService = async (driver, { lat, lng, sort } = {}) => {
    if (driver.status !== 'ACTIVE'){
        throw ForbiddenError("Your account is not active yet")
    }
    const driverLat = parseCoord(lat, 'lat', -90, 90)
    const driverLng = parseCoord(lng, 'lng', -180, 180)

    if ((driverLat === null) !== (driverLng === null)){
        throw BadRequestError("Both lat and long are required")
    }
    if (sort === 'nearest' && driverLat === null){
        throw BadRequestError("Lat and long are requied")
    }

    const activeCount = await Delivery.count({
        where: { driverId: driver.id, status: { [Op.in]: ['ASSIGNED', 'PICKED_UP'] } },
      })
      const base = { isOnline: driver.isOnline, canAccept: activeCount < MAX_ACTIVE_DELIVERIES, activeCount, maxActive: MAX_ACTIVE_DELIVERIES }

       // Offline drivers see nothing; the app shows "Go online to see orders"
      if (!driver.isOnline) return { ...base, orders: [] }

      const mappings = await DriverKitchen.findAll({ where: { driverId: driver.id, isActive: true }, attributes: ['kitchenId'], raw: true })
console.log("hi")
if (!mappings.length) return { ...base, orders: [] }

console.log("hi 2")
      const perKitchen = await Promise.all(mappings.map((m) => getKitchenOpenOrders(m.kitchenId)))
     console.log(perKitchen)
      const now = Date.now()
        // Cached objects are shared between drivers, so copy before adding per-driver fields
  let orders = perKitchen.flat().map((o) => ({
    ...o,
    driverToKitchenKm: driverLat === null ? null : round1(haversineKm(driverLat, driverLng, o.kitchen.lat, o.kitchen.lng)),
    waitingMinutes: Math.max(0, Math.floor((now - new Date(o.createdAt).getTime()) / 60000)),
  }))
  if (sort === 'nearest') orders.sort((a, b) => (a.driverToKitchenKm ?? Infinity) - (b.driverToKitchenKm ?? Infinity))
    else orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  
 
  return { ...base, orders }
  }

  
// ACCECPT ORDER SERVICE
export const acceptOrderService = async(driverId,orderId)=>{
    let delivery
    delivery = await sequelize.transaction(async (t) => {
       
        // 1. Lock the driver so two parallel accepts cannot both pass the 3-order limit
        const driver = await Driver.findByPk(driverId, { transaction: t, lock: t.LOCK.UPDATE })
        if (!driver || driver.status !== 'ACTIVE') throw ForbiddenError('Your account is not active')
            
            if (!driver.isOnline) throw ForbiddenError('Go online to accept orders')

            // 2. Lock the order so its status cannot change (e.g. cancel) while we decide
        const order = await Order.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE })
        if (!order) throw NotFoundError('Order')
        if (!OPEN_ORDER_STATUSES.includes(order.status) || !order.kitchenId) {
            throw ConflictError('This order is no longer available')
        }

         // 3. Driver must be mapped to this order's kitchen
      const mapped = await DriverKitchen.count({ where: { driverId, kitchenId: order.kitchenId, isActive: true }, transaction: t })
      if (!mapped) throw ForbiddenError('This order is not in your kitchens')
        

         // 4. Max active orders  
      const active = await Delivery.count({ where: { driverId, status: { [Op.in]: ['ASSIGNED', 'PICKED_UP'] } }, transaction:t })
      if (active >= MAX_ACTIVE_DELIVERIES) throw ConflictError(`You can carry at most ${MAX_ACTIVE_DELIVERIES} orders at a time`)

    // 5. Someone already took it?
    if (await Delivery.count({ where: { orderId }, transaction: t })) throw ConflictError('Order already taken by another driver')

           // 6. Snapshot what the driver needs (later address edits must not change history)
      const [address, payment] = await Promise.all([
        Address.findByPk(order.addressId, { transaction: t }),
        Payment.findOne({ where: { orderId }, transaction: t }),
      ])
      const { paymentMode, codAmount } = resolvePaymentMode(payment, order)
 
      const created = await Delivery.create(
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          kitchenId: order.kitchenId,
          driverId,
          status: 'ASSIGNED',
          paymentMode,
          codAmount,
          deliveryFee: order.deliveryFee,
          dropLat: address?.latitude ?? null, // null is allowed: driver can navigate by the address text
          dropLng: address?.longitude ?? null,
          dropAddress: address ? [address.line1, address.line2, address.landmark, address.city, address.pincode].filter(Boolean).join(', ') : null,
          customerName: address?.receiversName ?? null,
          customerMobile: address?.receiversPhone ?? null,
          assignedAt: new Date(),
        },
        { transaction: t }
      )
      await DeliveryStatusLog.create(
        { deliveryId: created.id, fromStatus: null, toStatus: 'ASSIGNED', actorType: 'DRIVER', actorId: driverId },
        { transaction: t }
      )
      return created
})

invalidateKitchenOpenOrders(delivery.kitchenId) // vanish from other drivers' lists immediately
return { message: 'Order accepted', delivery }
}


// GET ORDER DETAILS SERVICE
const kitchenAddress = (k) => [k.line1, k.line2, k.city, k.pincode].filter(Boolean).join(', ')

export async function closeDeliveriesOfDeadOrders(deliveries, orderById) {
  const dead = deliveries.filter((d) => DEAD_ORDER_STATUSES.includes(orderById[d.orderId]?.status))
  if (!dead.length) return []
 
  const closed = []
  await sequelize.transaction(async (t) => {
    for (const d of dead) {
      const [changed] = await Delivery.update(
        { status: 'CANCELLED', cancelReason: `Order ${orderById[d.orderId].status.toLowerCase()}`, version: literal('version + 1') },
        { where: { id: d.id, status: { [Op.in]: LIVE_DELIVERY_STATES } }, transaction: t }
      )
      if (changed > 0) {
        await DeliveryStatusLog.create(
          { deliveryId: d.id, fromStatus: d.status, toStatus: 'CANCELLED', actorType: 'SYSTEM', note: 'Order was cancelled; delivery closed automatically' },
          { transaction: t }
        )
        closed.push({ orderId: d.orderId, orderNumber: d.orderNumber })
      }
    }
  })
  return closed
}



export const orderDetailsDriverService=async(driverId,orderId)=>{
  const d = await Delivery.findOne({ where: { orderId, driverId }, raw: true })
  if (!d) throw NotFoundError('Order')
 
  const [order, kitchen, items] = await Promise.all([
    Order.findByPk(orderId, { attributes: ['id', 'orderNumber', 'status', 'specialInstr', 'subtotal', 'deliveryFee', 'discountAmt', 'taxAmt', 'totalAmt', 'createdAt'], raw: true }),
    Kitchen.findByPk(d.kitchenId, { attributes: ['id', 'name', 'line1', 'line2', 'city', 'pincode', 'latitude', 'longitude', 'contactPhone'], raw: true }),
    OrderItem.findAll({ where: { orderId }, raw: true }),
  ])
 
  let deliveryStatus = d.status
  if (LIVE_DELIVERY_STATES.includes(d.status) && DEAD_ORDER_STATUSES.includes(order?.status)) {
    await closeDeliveriesOfDeadOrders([d], { [orderId]: order })
    deliveryStatus = 'CANCELLED'
  }
 
  return {
    deliveryId: d.id,
    orderId,
    orderNumber: d.orderNumber,
    deliveryStatus,
    kitchenStatus: order?.status,
    canPickup: deliveryStatus === 'ASSIGNED' && canPickupOrderStatus(order?.status),
    kitchen: { id: kitchen.id, name: kitchen.name, address: kitchenAddress(kitchen), lat: Number(kitchen.latitude), lng: Number(kitchen.longitude), phone: kitchen.contactPhone },
    drop: {
      address: d.dropAddress,
      lat: d.dropLat === null ? null : Number(d.dropLat),
      lng: d.dropLng === null ? null : Number(d.dropLng),
      customerName: d.customerName,
      customerMobile: d.customerMobile,
    },
    payment: { mode: d.paymentMode, codAmount: Number(d.codAmount), codCollectedAmount: d.codCollectedAmount === null ? null : Number(d.codCollectedAmount) },
    items, // all columns of your order_items rows
    specialInstr: order?.specialInstr,
    amounts: order && { subtotal: order.subtotal, deliveryFee: order.deliveryFee, discount: order.discountAmt, tax: order.taxAmt, total: order.totalAmt },
    timeline: { assignedAt: d.assignedAt, pickedUpAt: d.pickedUpAt, deliveredAt: d.deliveredAt },
    cancelReason: d.cancelReason,
  }
}


// PICKUP ORDER SERVICE
export const orderPickupService = async (driverId, orderId, { lat, lng } = {}) => {
  const dLat = parseCoord(lat, 'lat', -90, 90)
  const dLng = parseCoord(lng, 'lng', -180, 180)

  // if ((dLat === null) !== (dLng === null)) throw BadRequestError('Send both lat and lng')
  const outcome = await sequelize.transaction(async (t) => {
    const d = await Delivery.findOne({ where: { orderId, driverId }, transaction: t, lock: t.LOCK.UPDATE })
    if(!d){
      throw NotFoundError("Delivery");
    }
       // App retry after a network drop (or the driver already moved on): answer success again
       if (d.status === 'PICKED_UP' || d.status === 'DELIVERED') return { delivery: d, already: true }
       if (d.status === 'CANCELLED') throw ConflictError('This order was cancelled')
      const order = await Order.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE })
       
       if(!order){
        throw NotFoundError("Order")

       }

          // Order cancelled in the meantime: close the delivery now (committed), then tell the driver
    if (DEAD_ORDER_STATUSES.includes(order.status)) {
      await d.update({ status: 'CANCELLED', cancelReason: `Order ${order.status.toLowerCase()}`, version: d.version + 1 }, { transaction: t })
      await DeliveryStatusLog.create(
        { deliveryId: d.id, fromStatus: 'ASSIGNED', toStatus: 'CANCELLED', actorType: 'SYSTEM', note: 'Order was cancelled; delivery closed automatically' },
        { transaction: t }
      )
      return { cancelledNow: true }
    }


    console.log(REQUIRE_PREPARED,canPickupOrderStatus(order.status))
    if (!canPickupOrderStatus(order.status)) {
      throw ConflictError('The food is not ready yet. Please wait for the kitchen to mark it ready')
    }

    const now = new Date()
    await d.update({ status: 'PICKED_UP', pickedUpAt: now, version: d.version + 1 }, { transaction: t })
    if (order.status !== 'OUT_FOR_DELIVERY') {
      await order.update({ status: 'OUT_FOR_DELIVERY', outForDeliveryAt: now }, { transaction: t })
    }

      // Audit only (not blocking): how far the driver was from the kitchen
      let note = null
      if (dLat !== null) {
        const kitchen = await Kitchen.findByPk(d.kitchenId, { attributes: ['latitude', 'longitude'], transaction: t, raw: true })
        const km = kitchen ? haversineKm(dLat, dLng, kitchen.latitude, kitchen.longitude) : null
        if (km !== null) note = `${Math.round(km * 1000)} m from kitchen`
      }

      await DeliveryStatusLog.create(
        { deliveryId: d.id, fromStatus: 'ASSIGNED', toStatus: 'PICKED_UP', actorType: 'DRIVER', actorId: driverId, lat: dLat, lng: dLng, note },
        { transaction: t }
      )
      return { delivery: d, already: false }

  })

  if (outcome.cancelledNow) throw ConflictError('This order was cancelled')
   // After commit: tell the customer "out for delivery" using your existing notification code
  return {
    message: outcome.already ? 'Order was already picked up' : 'Order picked up',
    alreadyPickedUp: outcome.already,
    delivery: {
      id: outcome.delivery.id,
      orderId: outcome.delivery.orderId,
      status: outcome.delivery.status,
      pickedUpAt: outcome.delivery.pickedUpAt,
    },
  }
}



// DELIVER ORDER SERVICE

// Compare money in paise (integers) so 540.10 vs "540.1" never fails on float rounding
const toPaise = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n * 100) : NaN
}

export const codPaidPatch = (paidAt = new Date()) => ({ status: 'PAID', paidAt })


export const deliverOrderService = async (driverId, orderId, { lat, lng, collectedAmount } = {})=>{
  const dLat = parseCoord(lat, 'lat', -90, 90)
  const dLng = parseCoord(lng, 'lng', -180, 180)

  // if ((dLat === null) !== (dLng === null)) throw BadRequestError('Send both lat and lng')
    
  const { delivery, alreadyDelivered } = await sequelize.transaction(async (t) => {


    // Lock the delivery: a double tap or an app retry cannot deliver twice
    const d = await Delivery.findOne({ where: { orderId, driverId }, transaction: t, lock: t.LOCK.UPDATE })
    if (!d) throw NotFoundError('Delivery')
 
    // Retry after a network drop: the first call already worked, so answer success again
    if (d.status === 'DELIVERED') return { delivery: d, alreadyDelivered: true }
    if (d.status === 'CANCELLED') throw ConflictError('This order was cancelled')
    if (d.status !== 'PICKED_UP') throw ConflictError('Pick up the order before delivering it')
 
    const order = await Order.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE })
    if (!order || ['CANCELLED', 'REFUNDED'].includes(order.status)) {
      throw ConflictError('This order was cancelled. Please contact support')
    }
 
    // ── COD: driver must confirm the exact amount ──────────────────────────
    const codDue = d.paymentMode === 'COD' ? toPaise(d.codAmount) : 0
    let collected = null
    if (codDue > 0) {
      const given = collectedAmount
      if (given === undefined || given === null || given === '') {
        throw BadRequestError(`Collect ₹${Number(d.codAmount).toFixed(2)} from the customer and confirm the amount`)
      }
      if (toPaise(given) !== codDue) {
        throw BadRequestError(`Amount must be exactly ₹${Number(d.codAmount).toFixed(2)}`)
      }
      collected = Number(d.codAmount)
    } else if (toPaise(collectedAmount) > 0) {
      throw BadRequestError('Nothing to collect for this order')
    }
 
    const now = new Date()
    const notes = []
 
    await d.update(
      {
        status: 'DELIVERED',
        deliveredAt: now,
        codCollectedAmount: collected,
        codCollectedAt: collected === null ? null : now,
        version: d.version + 1,
      },
      { transaction: t }
    )
    await order.update({ status: 'DELIVERED', deliveredAt: now }, { transaction: t })
 
    if (collected !== null) {
      notes.push(`COD collected ₹${collected.toFixed(2)}`)
      const payment = await Payment.findOne({ where: { orderId }, transaction: t, lock: t.LOCK.UPDATE })
      if (payment) await payment.update(codPaidPatch(now), { transaction: t })
      else notes.push('payment record not found')
    }
 
    // Audit only (not blocking): how far the driver was from the drop point
    if (dLat !== null) {
      const km = harversineDistance(dLat, dLng, d.dropLat, d.dropLng)
      if (km !== null) notes.push(`${Math.round(km * 1000)} m from drop point`)
    }
 
    await DeliveryStatusLog.create(
      {
        deliveryId: d.id,
        fromStatus: 'PICKED_UP',
        toStatus: 'DELIVERED',
        actorType: 'DRIVER',
        actorId: driverId,
        lat: dLat,
        lng: dLng,
        note: notes.join('; ') || null,
      },
      { transaction: t }
    )
    return { delivery: d, alreadyDelivered: false }
  })
 
  // After commit: send the "delivered" notification to the customer with your existing code (never inside the transaction)
  return {
    message: alreadyDelivered ? 'Order was already delivered' : 'Order delivered',
    alreadyDelivered,
    delivery: {
      id: delivery.id,
      orderId: delivery.orderId,
      orderNumber: delivery.orderNumber,
      status: delivery.status,
      paymentMode: delivery.paymentMode,
      codAmount: Number(delivery.codAmount),
      codCollectedAmount: delivery.codCollectedAmount === null ? null : Number(delivery.codCollectedAmount),
      deliveredAt: delivery.deliveredAt,
    },
  }


}



// DRIVER STATS 
const round1 = (n) => (n === null || n === undefined ? null : Math.round(n * 10) / 10)
 


// One aggregate column set per period, all computed in a single pass over the month's rows
const periodColumns = (name, param) => `
  (COUNT(*) FILTER (WHERE delivered_at >= ${param}))::int AS ${name}_orders,
  (COALESCE(SUM(cod_collected_amount) FILTER (WHERE delivered_at >= ${param}), 0))::float AS ${name}_cod,
  (AVG(EXTRACT(EPOCH FROM (delivered_at - assigned_at)) / 60) FILTER (WHERE delivered_at >= ${param}))::float AS ${name}_avg_min`
 


/** GET /stats: Today, This Week (Mon) and This Month in one query. Counts by DELIVERY time, IST. */
export const getDriverStatsService = async (driverId) => {
  const now = new Date()
  const { todayStart, weekStart, monthStart } = getStatsRanges(now)
  const earliest = weekStart < monthStart ? weekStart : monthStart // a week can start in the previous month
 
  const [row] = await sequelize.query(
    `SELECT ${periodColumns('today', ':todayStart')},
            ${periodColumns('week', ':weekStart')},
            ${periodColumns('month', ':monthStart')}
       FROM deliveries
      WHERE driver_id = :driverId
        AND status = 'DELIVERED'
        AND delivered_at >= :earliest
        AND delivered_at < :now`,
    { replacements: { driverId, todayStart, weekStart, monthStart, earliest, now }, type: QueryTypes.SELECT }
  )
 
  const period = (name, since) => ({
    since,
    orders: row[`${name}_orders`],
    codCollected: row[`${name}_cod`],
    avgDeliveryMinutes: round1(row[`${name}_avg_min`]), // accept -> delivered; null when no orders
  })
 
  return {
    timezone: 'Asia/Kolkata',
    asOf: now,
    today: period('today', todayStart),
    week: period('week', weekStart),
    month: period('month', monthStart),
  }
}


// DELIVERY HISTORY 

const DEFAULT_RANGE_DAYS = 30
const MAX_RANGE_DAYS = 90
const MAX_PAGE_SIZE = 50
 
const minutesBetween = (from, to) =>
  from && to ? Math.max(0, Math.round((new Date(to) - new Date(from)) / 60000)) : null


export const listHistoryService = async (driverId, { from, to, status, page, limit } = {}) => {
  if (status && !['DELIVERED', 'CANCELLED'].includes(status)) {
    throw BadRequestError('status must be DELIVERED or CANCELLED')
  }
 
  const now = new Date()
  const fromDay = parseIstDay(from, 'from')
  const toDay = parseIstDay(to, 'to')
  const rangeEnd = toDay ? new Date(toDay.getTime() + DAY_MS) : now // exclusive
  const rangeStart = fromDay ?? new Date(rangeEnd.getTime() - DEFAULT_RANGE_DAYS * DAY_MS)
 
  if (rangeStart >= rangeEnd) throw BadRequestError('from must be before to')
  if (rangeEnd - rangeStart > MAX_RANGE_DAYS * DAY_MS) throw BadRequestError(`Date range cannot be more than ${MAX_RANGE_DAYS} days`)
 
  const pageNo = Math.max(parseInt(page, 10) || 1, 1)
  const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), MAX_PAGE_SIZE)
  const inRange = { [Op.gte]: rangeStart, [Op.lt]: rangeEnd }
 
  // Delivered rows are dated by delivered_at; cancelled rows by updated_at (when they were closed)
  const branches = []
  if (!status || status === 'DELIVERED') branches.push({ status: 'DELIVERED', deliveredAt: inRange })
  if (!status || status === 'CANCELLED') branches.push({ status: 'CANCELLED', updatedAt: inRange })
 
  const { rows, count } = await Delivery.findAndCountAll({
    where: { driverId, [Op.or]: branches },
    attributes: ['id', 'orderId', 'orderNumber', 'status', 'paymentMode', 'codAmount', 'codCollectedAmount',
      'dropAddress', 'assignedAt', 'pickedUpAt', 'deliveredAt', 'updatedAt', 'cancelReason'],
    order: [[literal('COALESCE("delivered_at", "updated_at")'), 'DESC'], ['id', 'DESC']],
    limit: pageSize,
    offset: (pageNo - 1) * pageSize,
    raw: true,
  })
 
  return {
    range: { from: rangeStart, to: rangeEnd },
    page: pageNo,
    limit: pageSize,
    total: count,
    totalPages: Math.ceil(count / pageSize),
    items: rows.map((d) => ({
      deliveryId: d.id,
      orderId: d.orderId,
      orderNumber: d.orderNumber,
      status: d.status,
      paymentMode: d.paymentMode,
      codAmount: Number(d.codAmount),
      codCollectedAmount: d.codCollectedAmount === null ? null : Number(d.codCollectedAmount),
      dropAddress: d.dropAddress,
      completedAt: d.deliveredAt ?? d.updatedAt, // delivered time, or when the cancelled order was closed
      minutesTaken: d.status === 'DELIVERED' ? minutesBetween(d.assignedAt, d.deliveredAt) : null,
      cancelReason: d.cancelReason,
    })),
  }
}
 


 
// DRIVER CASH IN HAND 
const PENDING_LIST_LIMIT = 100
const RECENT_DEPOSITS_LIMIT = 20


export const getCashSummaryService = async (driverId) => {
  const pendingWhere = `d.driver_id = :driverId
                        AND d.status = 'DELIVERED'
                        AND d.cod_collected_amount IS NOT NULL
                        AND d.cash_deposit_id IS NULL`
 
  const [byKitchenRows, pendingRows, depositRows] = await Promise.all([
    // Totals per kitchen (a driver deposits cash to the kitchen the order came from)
    sequelize.query(
      `SELECT d.kitchen_id, k.name AS kitchen_name,
              COUNT(*)::int AS orders,
              COALESCE(SUM(d.cod_collected_amount), 0)::float AS amount,
              MIN(d.cod_collected_at) AS oldest_at
         FROM deliveries d JOIN kitchens k ON k.id = d.kitchen_id
        WHERE ${pendingWhere}
        GROUP BY d.kitchen_id, k.name
        ORDER BY MIN(d.cod_collected_at)`,
      { replacements: { driverId }, type: QueryTypes.SELECT }
    ),
    // The individual orders making up that cash (oldest first)
    sequelize.query(
      `SELECT d.id AS delivery_id, d.order_id, d.order_number, d.kitchen_id, k.name AS kitchen_name,
              d.cod_collected_amount::float AS amount, d.cod_collected_at
         FROM deliveries d JOIN kitchens k ON k.id = d.kitchen_id
        WHERE ${pendingWhere}
        ORDER BY d.cod_collected_at ASC
        LIMIT ${PENDING_LIST_LIMIT}`,
      { replacements: { driverId }, type: QueryTypes.SELECT }
    ),
    // Past deposits (the x.driver_id condition lets Postgres use the (driver_id, cash_deposit_id) index)
    sequelize.query(
      `SELECT cd.id, cd.amount::float AS amount, cd.deposited_at, cd.note, k.name AS kitchen_name,
              (SELECT COUNT(*)::int FROM deliveries x WHERE x.cash_deposit_id = cd.id AND x.driver_id = cd.driver_id) AS orders_count
         FROM cash_deposits cd JOIN kitchens k ON k.id = cd.kitchen_id
        WHERE cd.driver_id = :driverId
        ORDER BY cd.deposited_at DESC
        LIMIT ${RECENT_DEPOSITS_LIMIT}`,
      { replacements: { driverId }, type: QueryTypes.SELECT }
    ),
  ])
 
  // Add in paise (integers) so money never picks up floating-point noise
  const totalPaise = byKitchenRows.reduce((s, r) => s + toPaise(r.amount), 0)
  const pendingCount = byKitchenRows.reduce((s, r) => s + r.orders, 0)
 
  return {
    cashInHand: totalPaise / 100,
    pendingOrdersCount: pendingCount,
    oldestPendingAt: byKitchenRows.length ? byKitchenRows[0].oldest_at : null,
    byKitchen: byKitchenRows.map((r) => ({
      kitchenId: r.kitchen_id,
      kitchenName: r.kitchen_name,
      amount: r.amount,
      orders: r.orders,
      oldestAt: r.oldest_at,
    })),
    pendingOrders: pendingRows.map((r) => ({
      deliveryId: r.delivery_id,
      orderId: r.order_id,
      orderNumber: r.order_number,
      kitchenId: r.kitchen_id,
      kitchenName: r.kitchen_name,
      amount: r.amount,
      collectedAt: r.cod_collected_at,
    })),
    pendingListTruncated: pendingCount > pendingRows.length,
    recentDeposits: depositRows.map((r) => ({
      id: r.id,
      amount: r.amount,
      kitchenName: r.kitchen_name,
      ordersCount: r.orders_count,
      depositedAt: r.deposited_at,
      note: r.note,
    })),
  }
}