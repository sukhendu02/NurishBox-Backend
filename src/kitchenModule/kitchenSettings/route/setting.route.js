

import { Router } from "express";
import { kitchenAuth } from "../../../middleware/kitchenAuth.js";
import { getKitchenSettings,updateAcceptingOrders,getKitchenSecurityInfo,updateKitchenBasicSettings } from "../controller/setting.controller.js";
const router = Router();


//  KITCHEN ORDER 
router.get('/',kitchenAuth,getKitchenSettings)

router.patch('/', kitchenAuth, updateKitchenBasicSettings)

router.patch('/accepting-orders',kitchenAuth,updateAcceptingOrders)

router.get('/security', kitchenAuth, getKitchenSecurityInfo)

export default router;