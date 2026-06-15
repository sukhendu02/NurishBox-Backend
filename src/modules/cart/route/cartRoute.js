

import { Router } from "express";
const router = Router();

import { authenticate } from "../../../middleware/authenticate.js";
import { optionalAuth } from "../../../middleware/cart/optionalAuth.js";
import { getCart,addToCart, updateCartItem, removeItem,clearCart } from "../controller/cartController.js";


router.get('/',optionalAuth,getCart)

router.post("/",optionalAuth, addToCart);
router.patch("/:itemId",optionalAuth, updateCartItem);
router.delete("/:itemId",optionalAuth, removeItem);
router.delete("/",optionalAuth, clearCart);


export default router;