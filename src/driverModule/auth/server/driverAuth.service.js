import { literal, Op } from "sequelize";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, TooManyRequestsError, UnauthorizedError } from "../../../middleware/ErrorHandler.js";
import Driver from "../../../models/driver.js";
import DriverOtp from "../../../models/driverOtp.js";
import { generateOtp } from "../../../utils/generateOtp.js";
import dotenv from "dotenv";
dotenv.config();
import crypto from 'crypto'
import bcrypt from 'bcrypt';
import { sequelize } from "../../../Config/database.js";
import jwt from 'jsonwebtoken'
import Delivery from '../../../models/delivery.js'
import { LIVE_DELIVERY_STATES } from "../../order/service/driverorder.service.js";
const OTP_EXPIRY_MIN = 5
const MAX_ATTEMPTS = 5
const MAX_SENDS_PER_10_MIN = 10
const BLOCKED = ['SUSPENDED', 'INACTIVE']




export const sendOtptoDriverService= async(mobile)=>{
    const driver = await Driver.findOne({ where: { mobile }, attributes: ['id', 'status'] })

    if(!driver){
        throw NotFoundError("Driver not found");
    }
    const recent = await DriverOtp.count({
        where: { mobile, createdAt: { [Op.gt]: new Date(Date.now() - 10 * 60 * 1000) } },
      })

      if (recent >= MAX_SENDS_PER_10_MIN) {
        throw TooManyRequestsError("Too many OTP requests. Try again later")
      }

      
      if (driver && !BLOCKED.includes(driver.status)) {

          const otp = generateOtp(6);
          await DriverOtp.create({
            mobile,
            otpHash: await bcrypt.hash(otp, 10),
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000),
          })
          console.log(otp);
      }

    return {
        message: "OTP sent successfully",
    
    }
}
export const verifyDriverOtpService= async({ mobile, otp, deviceId, fcmToken })=>{
    if (!otp || !deviceId){
        throw BadRequestError("OTP and deviceId are required");
    }

    console.log(mobile,otp)
    const rec = await DriverOtp.findOne({
        where: { mobile, usedAt: null, expiresAt: { [Op.gt]: new Date() } },
        order: [['createdAt', 'DESC']],
    })
    console.log(rec)
    if(!rec){
        throw NotFoundError("Invalid or expired OTP");
    }
    if(rec.attempts >= MAX_ATTEMPTS){
        throw TooManyRequestsError("Too many attempts. Try again later");
    }

    const isValid = await bcrypt.compare(otp, rec.otpHash);
    if(!isValid){
        await DriverOtp.update({ attempts: rec.attempts + 1 }, { where: { id: rec.id } });
        throw UnauthorizedError("Invalid OTP");
    }
    const driver = await Driver.findOne({ where: { mobile } })
    if (!driver || BLOCKED.includes(driver.status)){
        throw UnauthorizedError( "Account is not allowed to login");
    }

    await sequelize.transaction(async (t) => {
        await rec.update({ usedAt: new Date() }, { transaction: t })
        // Bumping session_version invalidates the token on any other device (single-device login).
        await driver.update(
          {
            currentDeviceId: deviceId || null,
            fcmToken: fcmToken || null,
            sessionVersion: literal('session_version + 1'),
            isOnline: false,
            lastSeenAt: new Date(),
          },
          { transaction: t }
        )
      })
      await driver.reload()
console.log("login success")
    return {
        message: "OTP verified successfully",
        token: jwt.sign({ sub: driver.id,sv: driver.sessionVersion }, process.env.DRIVER_JWT_SECRET, 
            {
                expiresIn:'30d'
            }
        ),
        // refreshToken: jwt.sign({ userId: driver.id }, process.env.DRIVER_JWT_SECRET, { expiresIn: '7d' }),
        deviceId: deviceId,
        fcmToken: fcmToken,
        expiresAt: rec.expiresAt,
        attempts: rec.attempts,
        success: true,
        driver: driver,
    }

}


const ACTIVE_DELIVERY_STATES = ['ASSIGNED', 'PICKED_UP']


export const toggleDriverStatusServer = async(driverId,isOnline)=>{

    if (typeof isOnline !== 'boolean') {
        throw BadRequestError("status must be boolean");
    }

    return sequelize.transaction(async (t) => {

        
        const driver = await Driver.findByPk(driverId, { transaction: t, lock: t.LOCK.UPDATE })
        if(!driver){
            throw NotFoundError("Driver")
        }
        if (isOnline && driver.status !== 'ACTIVE') {
            throw ForbiddenError('Your account is not active yet. Please wait for verification')
        }
        if (!isOnline) {
            const activeCount = await Delivery.count({
                where: { driverId, status: { [Op.in]: ACTIVE_DELIVERY_STATES } },
                transaction: t,
              })
              if (activeCount > 0) {
                throw ConflictError("Complete your active orders before going offline")
              }
        }

        if (driver.isOnline !== isOnline) {
            await driver.update({ isOnline, lastSeenAt: new Date() }, { transaction: t })
        }

        
    return {
        message: isOnline ? 'You are online' : 'You are offline',
        isOnline: driver.isOnline,
      }
    })
    
}


// DRIVER LOGOUT 
export const logoutDriverService = async (driverId) => {
    return sequelize.transaction(async (t) => {
      // Same row lock as accept / go-offline, so nothing can slip in between the check and the update
      const driver = await Driver.findByPk(driverId, { transaction: t, lock: t.LOCK.UPDATE })
      if (!driver) throw NotFoundError('Driver ')
   
      const active = await Delivery.count({
        where: { driverId, status: { [Op.in]: LIVE_DELIVERY_STATES } },
        transaction: t,
      })
      if (active > 0) throw ConflictError('Complete your active orders before logging out. Order')
   
      await driver.update(
        {
          currentDeviceId: null,
          fcmToken: null,
          isOnline: false,
          sessionVersion: literal('session_version + 1'),
          lastSeenAt: new Date(),
        },
        { transaction: t }
      )
      return { message: 'Logged out successfully' }
    })
  }

