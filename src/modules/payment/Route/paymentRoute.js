

import { Router } from "express";
import { authenticate } from "../../../middleware/authenticate.js";
const router = Router();
import { createPaymentOrder,verifyPayment,razorpayWebhook } from "../Controller/paymentController.js";

router.post("/create-order",authenticate,createPaymentOrder)
router.post("/verify",authenticate,verifyPayment)
router.post("/webhook",razorpayWebhook)

export default router;