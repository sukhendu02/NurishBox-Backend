

import { Router } from "express";
import { kitchenAuth } from "../../../middleware/kitchenAuth.js";
import {getKitchenCatalog,importKitchenproduct,importedKitchenproduct,updateInventoryAvailability,updateInventoryQuantity } from "../controller/catalog.controller.js"
const router = Router();


//  KITCHEN REGISTER 
router.get('/',kitchenAuth,getKitchenCatalog)

router.post('/import',kitchenAuth,importKitchenproduct)

router.get('/imported',kitchenAuth,importedKitchenproduct)

router.patch('/:id/availability', kitchenAuth, updateInventoryAvailability)

router.patch('/:id/quantity', kitchenAuth, updateInventoryQuantity)

export default router;