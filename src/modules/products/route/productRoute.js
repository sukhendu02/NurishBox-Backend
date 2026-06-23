

import { Router } from "express";
const router = Router();

import { authenticate } from "../../../middleware/authenticate.js";
import { optionalAuth } from "../../../middleware/cart/optionalAuth.js";
import {getAllItems}  from "../controller/productController.js";
router.get("/",optionalAuth,getAllItems)

export default router;