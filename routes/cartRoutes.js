const express = require("express");
const { getCart, addToCart, updateCartItem,  removeFromCart, clearCart, syncCart } = require("../controllers/cartController.js");
const { protect } = require("../middleware/authMiddleware.js")
const { body } = require("express-validator")

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
router.route("/sync").post(protect, syncCart)

router.route("/:itemId").put(protect, validateUpdateCartItem, updateCartItem).delete(protect, removeFromCart)

module.exports = router