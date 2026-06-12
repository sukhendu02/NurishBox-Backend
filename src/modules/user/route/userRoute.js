

import { Router } from "express";
const router = Router();

import { authenticate } from "../../../middleware/authenticate.js";
import { getUserProfile,updateUserProfile,createUserAddress,getUserAllAddresses,getSingleAddress,updateUserAddress,deleteUserAddress,setDefaultAddress,
    getmyOrders,
} from "../controller/userController.js";

// PROFILE DETAILS 
router.get("/me",authenticate,getUserProfile)
router.patch("/me",authenticate,updateUserProfile)


// USER ADDRESS
router.post("/me/addresses",authenticate,createUserAddress);
router.get("/me/addresses",authenticate,getUserAllAddresses);
router.get("/me/addresses/:addressId",authenticate,getSingleAddress);
router.patch("/me/addresses/:addressId",authenticate,updateUserAddress);
router.delete("/me/addresses/:addressId",authenticate,deleteUserAddress);

// USER ADDRESS - SET DEFAULT (OPTIONAL)
router.patch('/me/addresses/:addressId/default',authenticate,  setDefaultAddress)


// USER ORDERS
router.get("/my-orders",authenticate,getmyOrders)

export default router;