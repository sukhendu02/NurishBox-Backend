

import { Router } from "express";
const router = Router();
import { sendOtptoDriver,verifyDriverOtp,getDriverProfile,toggleStatus,driverLogout } from "../controller/driverAuth.controller.js";
import { driverAuth } from "../../../middleware/driverAuth.js";

router.post('/send-otp', sendOtptoDriver)

router.post('/verify-otp',verifyDriverOtp )
 

router.post('/logout',driverAuth,driverLogout )

router.get('/profile', driverAuth,getDriverProfile )

router.patch('/me/status',driverAuth, toggleStatus)

// router.patch('/me/fcm-token', )

export default router;