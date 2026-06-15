
import express from "express"
import { Router } from "express";
import { razorpayWebhook } from "../Controller/paymentController.js";
const router = Router();

router.post("/",express.raw({ type: 'application/json' }),razorpayWebhook)

export default router;