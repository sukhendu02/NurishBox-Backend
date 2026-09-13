import { BadRequestError, NotFoundError } from "../../../middleware/ErrorHandler.js"
import Kitchen from "../../../models/kitchen.js"
import LoginHistory from "../../../models/loginHistory.js"
import Session from "../../../models/session.js"
export const getKitchenSettingsService = async (kitchenId) => {

    const kitchen = await Kitchen.findByPk(kitchenId, {
        attributes: [
            'id', 'name', 'kitchenCode', 'contactPhone',
            'line1', 'line2', 'city', 'state', 'pincode',
            'latitude', 'longitude', 'radiusKm',
            'openTime', 'closeTime', 'timezone',
            'isActive', 'acceptingOrders',
        ],
    })

    if (!kitchen) {
        throw NotFoundError("Kitchen ")
    }

    return kitchen
}

export const updateAcceptingOrdersService = async (kitchenId, acceptingOrders) => {

    if (typeof acceptingOrders !== 'boolean') {
     throw BadRequestError('acceptingOrders must be true or false')
    }

    const kitchen = await Kitchen.findByPk(kitchenId, {
        attributes: ['id', 'acceptingOrders'],
    })

    if (!kitchen) {
        throw NotFoundError(kitchen)
    }

    await kitchen.update({ acceptingOrders })

    return {
        id: kitchen.id,
        acceptingOrders: kitchen.acceptingOrders,
    }
}

export const getKitchenSecurityInfoService = async (kitchenUserId, { historyLimit = 10 } = {}) => {
 
    const currentSession = await Session.findOne({
        where: { kitchenUserId, status: 'active' },
        attributes: ['id', 'deviceId', 'deviceLabel', 'ipAddress', 'location', 'issuedAt', 'lastActiveAt'],
    })
 
    const loginHistory = await LoginHistory.findAll({
        where: { kitchenUserId },
        attributes: ['id', 'success', 'failureReason', 'deviceId', 'ipAddress', 'location', 'sessionEndReason', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: Number(historyLimit),
    })
 
    return {
        currentSession: currentSession || null,
        loginHistory,
    }
}



const EDITABLE_FIELDS = ['contactPhone', 'radiusKm', 'openTime', 'closeTime']
 
export const updateKitchenBasicSettingsService = async (kitchenId, payload) => {
 
    const updates = {}
 
    for (const field of EDITABLE_FIELDS) {
        if (payload[field] !== undefined) {
            updates[field] = payload[field]
        }
    }
 
    if (Object.keys(updates).length === 0) {
       throw BadRequestError('At least one of contactPhone, radiusKm, openTime, closeTime is required')
    }
 
    if (updates.radiusKm !== undefined) {
        const radius = Number(updates.radiusKm)
        if (Number.isNaN(radius) || radius <= 0 || radius>=25) {
            throw BadRequestError('radiusKm must be a positive number and in limit')
        }
        updates.radiusKm = radius
    }
 
    if (updates.contactPhone !== undefined && typeof updates.contactPhone !== 'string') {
        throw BadRequestError('contactPhone must be a string')
    }
 
    // Basic HH:MM or HH:MM:SS format check — not validating open < close here,
    // since some kitchens may genuinely operate past midnight.
    const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/
    for (const field of ['openTime', 'closeTime']) {
        if (updates[field] !== undefined && !TIME_PATTERN.test(updates[field])) {
            throw BadRequestError(`${field} must be a valid time in HH:MM or HH:MM:SS format`)
        }
    }
 
    const kitchen = await Kitchen.findByPk(kitchenId, {
        attributes: ['id', 'contactPhone', 'radiusKm', 'openTime', 'closeTime'],
    })
 
    if (!kitchen) {
        throw NotFoundError('Kitchen')
    }
 
    await kitchen.update(updates)
 
    return {
        id: kitchen.id,
        contactPhone: kitchen.contactPhone,
        radiusKm: kitchen.radiusKm,
        openTime: kitchen.openTime,
        closeTime: kitchen.closeTime,
    }
}