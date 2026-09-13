import { BadRequestError } from "../../../middleware/ErrorHandler.js"
// import KitchenUser from "../../../models/kitchenUser.js"
import KitchenUser from "../../../models/kitchenUser.js"
import bcrypt from 'bcrypt'
import Session from "../../../models/session.js"
import LoginHistory from "../../../models/loginHistory.js"
import Kitchen from "../../../models/kitchen.js"
import jwt from "jsonwebtoken"
import crypto from 'crypto'

const ACCESS_TOKEN_TTL = '1m'
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15 min


 
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

export const kitchenLoginService = async( kitchenCode,
    password,
    deviceId,
    deviceLabel,
    confirmKick,
    ipAddress,
    location,
    io)=>{

      // GET KITCHEN
      const kitchen = await Kitchen.findOne({
        where: { kitchenCode, isActive: true },
    })

    if (!kitchen) {
      await LoginHistory.create({
        attemptedKitchenCode: kitchenCode,
        success: false,
        failureReason: 'unknown_code',
        deviceId,
        ipAddress,
        location,
    })
      throw BadRequestError("Invalid Credentials")
    }


    // GET KITCHEN USER
    const getKitchenUser = await KitchenUser.findOne({
      where: { kitchenId: kitchen.id, isActive: true },
  })

  if(!getKitchenUser){

    await LoginHistory.create({
      attemptedKitchenCode: kitchenCode,
      success: false,
      failureReason: 'unknown_code',
      deviceId,
      ipAddress,
      location,
  })
      throw BadRequestError("Invalid Credentials")
  }

  // CHECK PASS
  const passwordValid = await bcrypt.compare(password, getKitchenUser.passwordHash)
  if(!passwordValid){
    await LoginHistory.create({
      kitchenUserId: getKitchenUser.id,
      attemptedKitchenCode: kitchenCode,
      success: false,
      failureReason: 'invalid_password',
      deviceId,
      ipAddress,
      location,
  })
    throw BadRequestError("Invalid Credentaials")
  }

  const activeSession = await Session.findOne({
    where: { kitchenUserId: getKitchenUser.id, status: 'active' },
})


// COMMENTED FOR TESTING (SINGLE LOGIIN ONLY) 

// if (activeSession && !confirmKick) {
//   // Not a failure — the controller turns this into a 409 so the client
//   // can prompt "log out other device and continue?".
//   return {
//       conflict: true,
//       activeSession: {
//           deviceLabel: activeSession.deviceLabel,
//           loggedInSince: activeSession.issuedAt,
//       },
//   }
// }
  

  // ACCESS TOKEN
  const accessToken = jwt.sign(
    { sub: getKitchenUser.id, kitchenId: kitchen.id, role: getKitchenUser.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
)

const refreshToken = crypto.randomBytes(48).toString('hex')

if (activeSession) {
  await activeSession.update({
      status: 'revoked',
      revokedAt: new Date(),
      revokedReason: 'kicked_by_new_login',
  })
  await LoginHistory.update(
      { sessionEndReason: 'kicked_by_new_login' },
      { where: { sessionId: activeSession.id } }
  )
  io?.to(`session:${activeSession.id}`).emit('force_logout', {
      reason: 'kicked_by_new_login',
  })
}

const newSession = await Session.create({
  kitchenUserId: getKitchenUser.id,
  deviceId,
  deviceLabel,
  ipAddress,
  location,
  issuedAt: new Date(),
  lastActiveAt: new Date(),
  expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  refreshTokenHash: hashToken(refreshToken),
  status: 'active',
})

await getKitchenUser.update({ lastLoginAt: new Date() })
 
await LoginHistory.create({
    kitchenUserId: getKitchenUser.id,
    attemptedKitchenCode: kitchenCode,
    success: true,
    deviceId,
    ipAddress,
    location,
    sessionId: newSession.id,
})


console.log(getKitchenUser)
  return {
    accessToken,
    refreshToken,
    kitchen: { id: getKitchenUser.kitchenId,kitchenCode, role: getKitchenUser.role },
  }
}


// GET ACCESS TOKEN FROM REFRESH TOKEN
export const kitchenRefreshService = async (refreshToken) => {
 
  if (!refreshToken) {
      throw BadRequestError('Refresh token is required')
  }

  const incomingHash = hashToken(refreshToken)

  const session = await Session.findOne({
      where: { refreshTokenHash: incomingHash, status: 'active' },
  })

  if (!session) {
     throw BadRequestError('Session expired, please log in again')
  }

  if (session.expiresAt < new Date()) {
      await session.update({ status: 'revoked', revokedAt: new Date(), revokedReason: 'expired' })
      throw BadRequestError('Session expired, please log in again')
  }

  const kitchenUser = await KitchenUser.findOne({
      where: { id: session.kitchenUserId, isActive: true },
  })

  if (!kitchenUser) {
      throw BadRequestError('Session expired, please log in again')
  }

  const getKitchen = await Kitchen.findByPk(kitchenUser.kitchenId);
 

  await session.update({ lastActiveAt: new Date() })

  const accessToken = jwt.sign(
      { sub: kitchenUser.id, kitchenId: kitchenUser.kitchenId, role: kitchenUser.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
  )

  return { accessToken,
    kitchen: { 
      id: kitchenUser.kitchenId,
      kitchenCode: getKitchen.kitchenCode,
       role: kitchenUser.role 
      },
   }
}

// LOGOUT SERVICE
export const kitchenLogoutService = async (kitchenUserId) => {
 
  const session = await Session.findOne({
      where: { kitchenUserId, status: 'active' },
  })

  if (!session) {
      BadRequestError('No active session found')
  }

  await session.update({
      status: 'revoked',
      revokedAt: new Date(),
      revokedReason: 'logout',
  })

  await LoginHistory.update(
      { sessionEndReason: 'logout' },
      { where: { sessionId: session.id } }
  )

  return { loggedOut: true }
}



export const kitchenRegisterService = async(kitchenData) =>{
    // validateKitchneData(kitchenData);

    
}


export const getKitchenProfileService = async(kitchenUserId)=>{
  const kitchenUser = await KitchenUser.findOne({
    where: { id: kitchenUserId, isActive: true },
    // passwordHash, recoveryContactPhone/Email, failedLoginCount, lockedUntil
    // deliberately excluded — this endpoint has no reason to return them
    attributes: ['id', 'role', 'kitchenEmail', 'kitchenPhone', 'lastLoginAt', 'createdAt'],
    include: [{
        model: Kitchen,
        as: 'kitchen',
        attributes: [
            'id', 'name', 'kitchenCode',
            'line1', 'line2', 'city', 'state', 'pincode',
            'openTime', 'closeTime', 'timezone',
            'isActive', 'acceptingOrders',
        ],
    }],
})

if (!kitchenUser) {
    throwBadRequestError('Profile not found')
}

return kitchenUser

}