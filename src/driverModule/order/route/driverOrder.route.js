

import { Router } from "express";
const router = Router();

import { driverAuth } from "../../../middleware/driverAuth.js";
import { listAvailableOrders,acceptOrder,orderDetailsDriver,orderPickup,deliverOrder,getDriverOrderHistory,getDriverStats,getCashSummary } from "../controller/driverorder.controller.js";

router.get('/available',driverAuth,listAvailableOrders )

router.post('/accept/:id',driverAuth,acceptOrder )

router.get('/:id/details',driverAuth,orderDetailsDriver )

router.post('/:id/pickup',driverAuth,orderPickup )

router.post('/:id/deliver',driverAuth,deliverOrder )

// GET /stats, GET /orders/history

router.get("/stats",driverAuth,getDriverStats)

router.get("/history",driverAuth,getDriverOrderHistory)

router.get('/cash/summary',  driverAuth, getCashSummary)

export default router;