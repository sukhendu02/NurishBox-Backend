// src/middleware/driverAuth.js
import jwt from 'jsonwebtoken'
import Driver from '../models/driver.js'
// import { jwtSecret } from '../services/driverAuth.service.js'

const fail = (res, status, code, message) => res.status(status).json({ success: false, code, message })

export async function driverAuth(req, res, next) {
  try {
    const h = req.headers.authorization || ''
    const token = h.startsWith('Bearer ') ? h.slice(7) : null
    if (!token) return fail(res, 401, 'NO_TOKEN', 'Login required')

    let payload
    try {
      payload = jwt.verify(token, process.env.DRIVER_JWT_SECRET)
    } catch {
      return fail(res, 401, 'TOKEN_INVALID', 'Login required')
    }

    const driver = await Driver.findByPk(payload.sub)
    // Another device logged in (or logout happened): session_version no longer matches.
    if (!driver || driver.sessionVersion !== payload.sv) {
      return fail(res, 401, 'SESSION_EXPIRED', 'You were logged out. Please login again')
    }
    if (['SUSPENDED', 'INACTIVE'].includes(driver.status)) return fail(res, 403, 'ACCOUNT_BLOCKED', 'Account is not active')

    req.driver = driver
    next()
  } catch (err) {
    next(err)
  }
}

// Use on routes that need a verified (ACTIVE) driver.
export function requireActive(req, res, next) {
  if (req.driver.status !== 'ACTIVE') return fail(res, 403, 'NOT_ACTIVE', 'Your account is awaiting verification')
  next()
}