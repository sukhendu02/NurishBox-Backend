

import { Router } from "express";
const router = Router();

import { sendOTP,verifyOTP } from "../Controller/authController.js";


// Register route
// router.post('/register', registeruser);

// SEND OTP
router.post('/send-otp',sendOTP);

// VERIFY OTP
router.post('/verify-otp', verifyOTP);

// Login route
// router.post('/login', authController.login);

// SEND OTP route

// VERIFY OTP route

export default router;