

import { Router } from "express";
const router = Router();

import { authenticate } from "../../../middleware/authenticate.js";
import { optionalAuth } from "../../../middleware/cart/optionalAuth.js";
import { getCart,getCart2,addToCart, updateCartItem, removeItem,clearCart,checkItemAvailability } from "../controller/cartController.js";


router.get('/',optionalAuth,getCart2)

router.post("/",optionalAuth, addToCart);
router.patch("/:itemId",optionalAuth, updateCartItem);
router.delete("/:itemId",optionalAuth, removeItem);
router.delete("/",optionalAuth, clearCart);

// CHECK AVAILIABLITY OF ITEMS
router.post('/check-availability', optionalAuth,checkItemAvailability)


export default router;