

import { Router } from "express";
import { getKitchenDashboardStats,getKitchenHourlyTrend,getKitchenProductStats } from "../controller/report.controller.js";
const router = Router();


import { kitchenAuth } from "../../../middleware/kitchenAuth.js";

router.get('/stats', kitchenAuth, getKitchenDashboardStats)

router.get('/hourly-trend', kitchenAuth, getKitchenHourlyTrend)

router.get('/product-stats', kitchenAuth, getKitchenProductStats)
export default router;