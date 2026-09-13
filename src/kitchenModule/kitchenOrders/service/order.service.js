import { BadRequestError, NotFoundError } from "../../../middleware/ErrorHandler.js"
import { assertKitchenOwnership } from "../../../middleware/kitchenAuth.js"
import Order from "../../../models/order.js"
import OrderItem from "../../../models/orderItem.js"
import Payment from "../../../models/payment.js"
import { Op } from "sequelize"
import { User } from "../../../modules/auth/Models/user.js"
import Address from "../../../models/address.js"

export const getKitchenOrdersService = async (kitchenId, { status, page = 1, limit = 20 }) => {
 
    const where = { kitchenId }
    if (status) {
        const statuses = status.split(',').map((s) => s.trim())
        where.status = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0]
    }
 
    const offset = (page - 1) * limit
 
    const { rows, count } = await Order.findAndCountAll({
        where,
        attributes: ['id', 'orderNumber', 'status', 'totalAmt', 'specialInstr', 'placedAt', 'createdAt'],
        include: [{
            model: OrderItem,
            as: 'items',
            attributes: ['id', 'productName', 'productImage', 'quantity'],
        },
        {
            model: Payment,
            as: 'payment',
            attributes: ['method', 'status'],
        },
        {
            model: User,
            as: 'user',
            attributes: ['name', 'phone', 'email'],
        },
        {
            model: Address,
            as: 'address',
            attributes: ['receiversName','receiversPhone','line1', 'line2', 'landmark', 'city','state','pincode','latitude','longitude'],
        },
    
    ],
        limit: Number(limit),
        offset: Number(offset),
        // Oldest first — a kitchen queue should work FIFO so nothing gets missed
        order: [['createdAt', 'ASC']],
    })
 
    return {
        orders: rows,
        pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / limit),
        },
    }
}

export const getKitchenOrderDetailService = async (kitchenId, orderId) => {
 
    const order = await Order.findByPk(orderId, {
        attributes: [
            'id', 'orderNumber', 'status',
            'subtotal', 'deliveryFee', 'discountAmt', 'taxAmt', 'totalAmt',
            'specialInstr',
            'placedAt', 'confirmedAt', 'preparingAt', 'outForDeliveryAt', 'deliveredAt',
            'kitchenId', 'createdAt',
        ],
        include: [
            {
                model: OrderItem,
                as: 'items',
                attributes: ['id', 'productName', 'productImage', 'productCategory', 'quantity', 'unitPrice', 'totalPrice'],
            },
            {
                model: Payment,
                as: 'payment',
                attributes: ['method', 'status'],
            },
            {
                model: User,
                as: 'user',
                attributes: ['name', 'phone', 'email'],
            },
            {
                model: Address,
                as: 'address',
                attributes: ['receiversName','receiversPhone','line1', 'line2', 'landmark', 'city','state','pincode','latitude','longitude'],
            },
        ],
    })
 
    if (!order) {
        throw NotFoundError('Order not found')
    }
 
    assertKitchenOwnership(order.kitchenId, kitchenId)
 
    return order
}



// Each status can only move to exactly one next status — no skipping,
// no going backward. Matches the confirmed kitchen flow.
const VALID_TRANSITIONS = {
    PLACED: 'CONFIRMED',
    CONFIRMED: 'PREPARING',
    PREPARING: 'PREPARED',
    PREPARED:'OUT_FOR_DELIVERY',
    OUT_FOR_DELIVERY: 'DELIVERED',
}
 
const TIMESTAMP_FIELD = {
    CONFIRMED: 'confirmedAt',
    PREPARING: 'preparingAt',
    PREPARED:'preparedAt',
    OUT_FOR_DELIVERY: 'outForDeliveryAt',
    DELIVERED: 'deliveredAt',
}
 
export const updateKitchenOrderStatusService = async (kitchenId, orderId, requestedStatus) => {
 
    const order = await Order.findByPk(orderId, {
        attributes: ['id', 'orderNumber', 'status', 'kitchenId'],
    })
 
    if (!order) {
        throw NotFoundError("Order ")
    }
 
    assertKitchenOwnership(order.kitchenId, kitchenId)
 
    const expectedNextStatus = VALID_TRANSITIONS[order.status]
 
    if (!expectedNextStatus || expectedNextStatus !== requestedStatus) {
        throw BadRequestError(
            `Cannot move order from ${order.status} to ${requestedStatus}. Expected next status: ${expectedNextStatus || 'none — order is in a terminal state'}`
        )
    }
 
    await order.update({
        status: requestedStatus,
        [TIMESTAMP_FIELD[requestedStatus]]: new Date(),
    })
 
    return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
    }
}
 

// CANCELLATION

const CANCELLABLE_STATUSES = ['PLACED', 'CONFIRMED', 'PREPARING','OUT_FOR_DELIVERY']
 
const REASON_LABELS = {
    OUT_OF_STOCK: 'Out of stock',
    KITCHEN_OVERLOADED: 'Kitchen overloaded',
    ITEM_UNAVAILABLE: 'Item unavailable',
    OTHER: 'Other',
}
 
export const cancelKitchenOrderService = async (kitchenId, orderId, reason) => {
 
    if (!REASON_LABELS[reason]) {
        throw BadRequestError('A valid cancellation reason is required')
    }
 
    if (!reason.trim()) {
        throw BadRequestError('A note is required when reason is OTHER')
    }
 
    const order = await Order.findByPk(orderId, {
        attributes: ['id', 'orderNumber', 'status', 'kitchenId'],
    })
 
    if (!order) {
        throw NotFoundError('Order ')
    }
 
    assertKitchenOwnership(order.kitchenId, kitchenId)
 
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
        throw BadRequestError(
            `Cannot cancel an order in ${order.status} status. Cancellation is only allowed before the order is out for delivery.`
        )
    }
 
    const cancellationReason = reason
 
    await order.update({
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason,
        cancelledBy: 'KITCHEN',
    })
 
    return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        cancellationReason: order.cancellationReason,
    }
}



// export const getAllKitchenOrdersService = async (
//     kitchenId,
//     { status, paymentMethod, search, sortBy, sortDir = 'asc', startDate, endDate, page = 1, limit = 20 }
// ) => {
 
//     const where = { kitchenId }
 
//     if (status) {
//         const statuses = status.split(',').map((s) => s.trim())
//         where.status = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0]
//     }
 
//     if (startDate || endDate) {
//         where.createdAt = {}
//         if (startDate) where.createdAt[Op.gte] = new Date(startDate)
//         if (endDate) where.createdAt[Op.lte] = new Date(endDate)
//     }
 
//     // ── Search across order number, customer name, and total amount ──
//     // NOTE: this spans the parent (Order) and joined (User) tables in one
//     // OR condition — Sequelize doesn't have a clean built-in for this, so
//     // it's built with raw column references. The alias strings below
//     // ('Order.total_amt', 'user.name') depend on the model name and the
//     // association's `as` matching exactly what Sequelize generates in the
//     // SQL — test this against your actual Sequelize version before relying
//     // on it; this is the one part of this change most likely to need a
//     // small adjustment.
//     if (search) {
//         where[Op.or] = [
//             { orderNumber: { [Op.iLike]: `%${search}%` } },
//             sequelizeWhere(cast(col('Order.total_amt'), 'text'), { [Op.iLike]: `%${search}%` }),
//             sequelizeWhere(col('user.name'), { [Op.iLike]: `%${search}%` }),
//         ]
//     }
 
//     const paymentInclude = {
//         model: Payment,
//         as: 'payment',
//         attributes: ['method', 'status'],
//         required: !!paymentMethod,
//     }
//     if (paymentMethod) {
//         paymentInclude.where = { method: paymentMethod }
//     }
 
//     const offset = (page - 1) * limit
//     const sortDirection = sortDir === 'desc' ? 'DESC' : 'ASC'
 
//     let orderClause = [['createdAt', 'ASC']] // unchanged default
//     if (sortBy === 'orderNumber') {
//         orderClause = [['orderNumber', sortDirection]]
//     } else if (sortBy === 'customerName') {
//         orderClause = [[{ model: User, as: 'user' }, 'name', sortDirection]]
//     }
 
//     const { rows, count } = await Order.findAndCountAll({
//         where,
//         attributes: ['id', 'orderNumber', 'status', 'totalAmt', 'specialInstr', 'placedAt', 'createdAt'],
//         include: [
//             {
//                 model: OrderItem,
//                 as: 'items',
//                 attributes: ['id', 'productName', 'productImage', 'quantity'],
//             },
//             {
//                 model: User,
//                 as: 'user',
//                 attributes: ['id', 'name'], // assumes User has a `name` field — adjust if it's split firstName/lastName
//                 required: false, // LEFT JOIN — orders shouldn't disappear if this ever fails to match
//             },
//             {
//                 model: Address,
//                 as: 'address',
//                 attributes: ['receiversName','receiversPhone','line1', 'line2', 'landmark', 'city','state','pincode','latitude','longitude'],
//             },
//             paymentInclude,
//         ],
//         limit: Number(limit),
//         offset: Number(offset),
//         order: orderClause,
//         subQuery: false, // needed because we reference the joined `user` alias in a top-level where/order
//     })
 
//     const orders = rows.map((row) => ({
//         id: row.id,
//         orderNumber: row.orderNumber,
//         status: row.status,
//         totalAmt: row.totalAmt,
//         specialInstr: row.specialInstr,
//         placedAt: row.placedAt,
//         createdAt: row.createdAt,
//         items: row.items, // unchanged shape — Live Orders board already depends on this
//         user: row.user ? { name: row.user.name } : null,
//         itemsSummary: row.items.map((item) => `${item.quantity}x ${item.productName}`).join(', '),
//         payment: row.payment,
//         address:row.address
//     }))
 
//     return {
//         orders,
//         pagination: {
//             total: count,
//             page: Number(page),
//             limit: Number(limit),
//             totalPages: Math.ceil(count / limit),
//         },
//     }
// }


export const getAllKitchenOrdersService = async (
    kitchenId,
    { status, paymentMethod, search, sortBy, sortDir = 'asc', startDate, endDate, page = 1, limit = 20 }
) => {
 
    const where = { kitchenId,
        status: {
            [Op.ne]: "PENDING",
          },
     }
 
    if (status) {
        const statuses = status.split(',').map((s) => s.trim())
        where.status = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0]
    }
 
    if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt[Op.gte] = new Date(startDate)
        if (endDate) where.createdAt[Op.lte] = new Date(endDate)
    }
 
    // ── Search across order number, customer name, and total amount ──
    // NOTE: this spans the parent (Order) and joined (User) tables in one
    // OR condition — Sequelize doesn't have a clean built-in for this, so
    // it's built with raw column references. The alias strings below
    // ('Order.total_amt', 'user.name') depend on the model name and the
    // association's `as` matching exactly what Sequelize generates in the
    // SQL — test this against your actual Sequelize version before relying
    // on it; this is the one part of this change most likely to need a
    // small adjustment.
    if (search) {
        where[Op.or] = [
            { orderNumber: { [Op.iLike]: `%${search}%` } },
            sequelizeWhere(cast(col('Order.total_amt'), 'text'), { [Op.iLike]: `%${search}%` }),
            sequelizeWhere(col('user.name'), { [Op.iLike]: `%${search}%` }),
        ]
    }
 
    const paymentInclude = {
        model: Payment,
        as: 'payment',
        attributes: ['method', 'status','paidAt'],
        required: !!paymentMethod,
    }
    if (paymentMethod) {
        paymentInclude.where = { method: paymentMethod }
    }
 
    const offset = (page - 1) * limit
    const sortDirection = sortDir === 'desc' ? 'DESC' : 'ASC'
 
    let orderClause = [['createdAt', 'DESC']] // unchanged default
    if (sortBy === 'orderNumber') {
        orderClause = [['orderNumber', sortDirection]]
    } else if (sortBy === 'customerName') {
        orderClause = [[{ model: User, as: 'user' }, 'name', sortDirection]]
    }
 
    const { rows, count } = await Order.findAndCountAll({
        where,
        attributes: ['id', 'orderNumber', 'status', 'totalAmt', 'specialInstr', 'placedAt', 'createdAt', 'subtotal', 'deliveryFee', 'discountAmt','couponCode', 'couponDiscountAmount', 'confirmedAt', 'preparingAt', 'preparedAt','outForDeliveryAt','deliveredAt','cancelledAt', 'cancellationReason', 'cancelledBy'],
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'name'], // assumes User has a `name` field — adjust if it's split firstName/lastName
                required: false, // LEFT JOIN — orders shouldn't disappear if this ever fails to match
            },
            {
                                model: Address,
                                as: 'address',
                                attributes: ['receiversName','receiversPhone','line1', 'line2', 'landmark', 'city','state','pincode','latitude','longitude'],
                            },
            paymentInclude,
        ],
        limit: Number(limit),
        offset: Number(offset),
        order: orderClause,
        subQuery: false, // safe here — only one-to-one joins (User, Payment) are present, no hasMany
        distinct: true,  // required alongside subQuery:false so `count` reflects distinct orders, not joined rows
    })
 
    // OrderItem is hasMany — fetched separately and attached below, rather than
    // included above. Combining a hasMany include with subQuery:false + limit
    // silently breaks pagination (an order with 3 items could consume 3 of your
    // `limit` slots instead of 1). Keeping this as its own query sidesteps that
    // entirely, at the cost of one extra round trip.
    const orderIds = rows.map((row) => row.id)
    const itemRows = orderIds.length
        ? await OrderItem.findAll({
            where: { orderId: { [Op.in]: orderIds } },
            attributes: ['id', 'orderId', 'productName', 'productImage', 'quantity','unitPrice', 'totalPrice'],
        })
        : []
 
    const itemsByOrderId = itemRows.reduce((acc, item) => {
        if (!acc[item.orderId]) acc[item.orderId] = []
        acc[item.orderId].push(item)
        return acc
    }, {})
 
    const orders = rows.map((row) => {
        const items = itemsByOrderId[row.id] || []
        return {
            // Order details
        id: row.id,
        orderNumber: row.orderNumber,
        status: row.status,
        specialInstr: row.specialInstr,

        // Pricing
        totalAmt: row.totalAmt,
        subtotal: row.subtotal,
        deliveryFee: row.deliveryFee,
        discountAmt: row.discountAmt,
        couponCode: row.couponCode,
        couponDiscountAmount: row.couponDiscountAmount,

        // Items
        items,
        itemsSummary: items
            .map((item) => `${item.quantity}x ${item.productName}`)
            .join(', '),

        // Customer
        user: row.user,

        // Payment
        payment: row.payment,

        // Delivery address
        address: row.address,

        // Order timeline
        placedAt: row.placedAt,
        confirmedAt: row.confirmedAt,
        preparingAt: row.preparingAt,
        preparedAt: row.preparedAt,
        outForDeliveryAt: row.outForDeliveryAt,
        deliveredAt: row.deliveredAt,

        // Cancellation
        cancelledAt: row.cancelledAt,
        cancellationReason: row.cancellationReason,
        cancelledBy: row.cancelledBy,

        // Record creation
        createdAt: row.createdAt,
        }
    })
 
    return {
        orders,
     
        pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / limit),
        },
    }
}