import { Router } from "express";
const router = Router();

import { authenticate } from "../../../middleware/authenticate.js";
import { placeOrder,getOrderDetails,trackOrder } from "../Controller/orderController.js";

// PLACE ORDER
router.post("/place-order",authenticate,placeOrder)

router.get("/:orderId",authenticate,getOrderDetails)

router.get("/track/:orderId",trackOrder)

export default router;