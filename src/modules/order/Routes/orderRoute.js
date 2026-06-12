import { Router } from "express";
const router = Router();

import { authenticate } from "../../../middleware/authenticate.js";
import { placeOrder } from "../Controller/orderController.js";
// PLACE ORDER
router.post("/place-order",authenticate,placeOrder)


export default router;