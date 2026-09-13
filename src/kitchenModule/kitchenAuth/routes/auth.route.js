

import { Router } from "express";
const router = Router();

import {kitchenLogin,kitchenRegister,kitchenRefresh,kitchenLogout} from '../controller/auth.controller.js'
import { kitchenAuth } from "../../../middleware/kitchenAuth.js";

//  KITCHEN REGISTER 
router.post('/register',kitchenRegister)

// LOGIN KITCHEN 
router.post('/login',kitchenLogin)

router.post('/refresh',kitchenRefresh)

router.post('/logout',kitchenAuth,kitchenLogout)

export default router;