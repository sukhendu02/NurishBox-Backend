

import { Router } from "express";
import { kitchenAuth } from "../../../middleware/kitchenAuth.js";
import { getKitchenOrders,getKitchenOrderDetail,updateKitchenOrderStatus,cancelKitchenOrder ,getALLKitchenOrders} from "../controller/order.controller.js";
const router = Router();


//  KITCHEN ORDER 
router.get('/',kitchenAuth,getKitchenOrders)

router.get('/all',kitchenAuth,getALLKitchenOrders)


router.get('/:id', kitchenAuth, getKitchenOrderDetail)


router.patch('/:id/status', kitchenAuth, updateKitchenOrderStatus)

router.patch('/:id/cancel', kitchenAuth, cancelKitchenOrder)

export default router;