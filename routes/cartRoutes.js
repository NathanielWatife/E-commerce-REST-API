import express from "express";
import { getCart, addToCart, UpdateCartItem,  removeFromCart, clearCart } from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js"
import { body } from "express-validator"

const router = express.Router()

// validation middleware
const validateAddToCart = [
    body("productId").notEmpty().withMessage("product ID is required"),
    body("quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be at least 1")
]

const validateUpdateCartItem = [
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1")
]


// Routes
router.route("/").get(protect, getCart).post(protect, validateAddToCart, addToCart).delete(protect, clearCart)

router.route("/:itemId").put(protect, validateUpdateCartItem, updateCartItem).delete(protect, removeFromCart)

export default router