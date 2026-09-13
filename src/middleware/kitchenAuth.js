import jwt from 'jsonwebtoken'
import Kitchen from '../models/kitchen.js'
import KitchenUser from '../models/kitchenUser.js'
import { BadRequestError, ForbiddenError, UnauthorizedError } from './ErrorHandler.js'


export const kitchenAuth = async (req, res, next) => {

    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
        throw UnauthorizedError("Authentication Token Missing")
    }

    let payload
    try {
        payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    } catch (err) {
        throw UnauthorizedError('Invalid or expired token')
    }

    // Re-checked against the DB on every request, not just trusted from the token —
    // so deactivating a KitchenUser takes effect immediately, without waiting for
    // the 15-minute access token to expire on its own.
    const kitchenUser = await KitchenUser.findOne({
        where: { id: payload.sub, isActive: true },
    })

    if (!kitchenUser) {
        throw ForbiddenError("Forbidden")
    }

    // kitchenId is ONLY ever set from this verified lookup — never from
    // req.body, req.headers, or req.query. This is what every downstream
    // route relies on for tenant isolation.
    req.kitchenAuth = {
        kitchenUserId: kitchenUser.id,
        kitchenId: kitchenUser.kitchenId,
        role: kitchenUser.role,
    }

    next()
}

// Call this inside any route handler once you've fetched the resource —
// resourceKitchenId must come from the DB row you just fetched, never from
// the request itself.
export const assertKitchenOwnership = (resourceKitchenId, authenticatedKitchenId) => {
    if (resourceKitchenId !== authenticatedKitchenId) {
        console.warn(
            `[SECURITY] kitchenUser ${authenticatedKitchenId} attempted access to kitchen ${resourceKitchenId}`
        )
        throw ForbiddenError('Forbidden')
    }
}
// export const assertKitchenOwnership = (resourceKitchenId, req) => {
//     if (resourceKitchenId !== req.kitchenAuth.kitchenId) {
//         console.warn(
//             `[SECURITY] kitchenUser ${req.kitchenAuth.kitchenUserId} attempted access to kitchen ${resourceKitchenId}`
//         )
//         throw ForbiddenError('Forbidden')
//     }
// }