

import { Router } from "express";
const router = Router();

import { sendOTP,verifyOTP ,registerUser, getrefreshToken ,logout,logoutAll,verifyEmail,checkProtected} from "../Controller/authController.js";
import  {verifyTempToken}  from "../../../middleware/verifyTemptoken.js";
import { authenticate } from "../../../middleware/authenticate.js";




// SEND OTP
router.post('/send-otp',sendOTP);

// VERIFY OTP
router.post('/verify-otp', verifyOTP);


// REGISTER USER
router.post('/register-user',verifyTempToken,registerUser)

// REFRESH TOKEN ROUTE
router.post("/refresh-token", getrefreshToken);

// LOGOUT
router.post("/logout",authenticate,logout);

// LOGOUT FORM ALL DEVICES
router.post("/logout-all",authenticate,logoutAll)


// PROTECTED ROUTE
router.get('/protected',authenticate,checkProtected)

router.post("/verify-email",authenticate,verifyEmail)
export default router;