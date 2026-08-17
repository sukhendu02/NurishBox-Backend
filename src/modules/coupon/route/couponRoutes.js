import { Router } from "express";
import { authenticate } from "../../../middleware/authenticate.js";
const router = Router();
import { applyCoupon,removeCoupon,getAvailableCoupons } from "../controller/couponController.js";
// PLACE ORDER

router.post('/',authenticate,applyCoupon);
router.post('/remove',authenticate,removeCoupon);

router.get('/available',authenticate,getAvailableCoupons);
export default router;