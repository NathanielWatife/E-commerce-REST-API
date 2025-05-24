import express from "express"
import {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  getMyOrders,
  getOrders,
  updateOrderStatus,
  cancelOrder,
} from "../controllers/orderController.js"
import { protect, admin } from "../middleware/authMiddleware.js"
import { body } from "express-validator"

const router = express.Router()


// Validation middleware
const validateCreateOrder = [
  body("shippingAddress").notEmpty().withMessage("Shipping address is required"),
  body("shippingAddress.street").notEmpty().withMessage("Street is required"),
  body("shippingAddress.city").notEmpty().withMessage("City is required"),
  body("shippingAddress.state").notEmpty().withMessage("State is required"),
  body("shippingAddress.postalCode").notEmpty().withMessage("Postal code is required"),
  body("shippingAddress.country").notEmpty().withMessage("Country is required"),
  body("paymentMethod").notEmpty().withMessage("Payment method is required"),
]

const validateOrderStatus = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
    .withMessage("Invalid status"),
]

// Routes
router.route("/").post(protect, validateCreateOrder, createOrder).get(protect, admin, getOrders)
router.route("/myorders").get(protect, getMyOrders)
router.route("/:id").get(protect, getOrderById)
router.route("/:id/pay").put(protect, updateOrderToPaid)
router.route("/:id/deliver").put(protect, admin, updateOrderToDelivered)
router.route("/:id/status").put(protect, admin, validateOrderStatus, updateOrderStatus)
router.route("/:id/cancel").put(protect, cancelOrder)
export default router
